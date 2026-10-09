import { config } from "../config";
import { formatoBs, formatoTasa, formatoUsd, redondear } from "../dinero";
import { marcaTiempo } from "../fechas";
import { nuevoId } from "../ids";
import { getStore, type Pendiente, type Usuario } from "../store";
import { verificarCredenciales } from "../sesion";
import { leerDocumento, lectorDisponible, type FacturaLeida, type PagoLeido } from "../ai/lector";
import { sugerirProducto } from "../emparejar";
import { METODOS_PAGO } from "../rubros";
import { calcularResumen } from "../services/resumen";
import { stockActual } from "../services/inventario";
import { tasaDelDia, tasaNegocio } from "../services/tasas";
import { registrarVenta } from "../services/ventas";
import { registrarGasto } from "../services/gastos";
import { descargarArchivo, editarMensaje, enviarMensaje, h, tg } from "./api";

// Tipos mínimos de la Bot API que usamos.
interface TgUsuario { id: number; first_name?: string }
interface TgMensaje {
  message_id: number;
  chat: { id: number; type: string };
  from?: TgUsuario;
  text?: string;
  caption?: string;
  photo?: { file_id: string; file_size?: number }[];
  document?: { file_id: string; mime_type?: string; file_name?: string };
}
interface TgCallback { id: string; from: TgUsuario; message?: TgMensaje; data?: string }
export interface TgUpdate { update_id: number; message?: TgMensaje; callback_query?: TgCallback }

const AYUDA = `<b>Comandos</b>
/resumen – ventas, gastos y ganancia de hoy, la semana y el mes
/stock – productos con stock bajo o agotados
/cobrar – ventas pendientes por cobrar
/tasa – tasa BCV del día

📷 <b>Envía una foto</b> de un capture de pago o de una factura y te pregunto si es venta o gasto. La leo, te muestro los datos y la registro cuando confirmes con ✅.`;

export async function manejarUpdate(u: TgUpdate) {
  if (u.callback_query) return manejarBoton(u.callback_query);
  const m = u.message;
  if (!m || m.chat.type !== "private") return; // solo chats privados con el bot
  const chatId = String(m.chat.id);
  const texto = (m.text ?? "").trim();

  if (texto.startsWith("/vincular")) return vincular(m, texto);

  const usuario = await usuarioDeChat(chatId);
  if (!usuario) {
    return enviarMensaje(chatId,
      `Hola 👋 Soy el bot de <b>${h(config.negocio)}</b>.\n\nPara usarme, vincula tu usuario de la app:\n<code>/vincular TuNombre TuPIN</code>\n\n(Borro el mensaje con tu PIN apenas lo lea.)`);
  }

  if (m.photo?.length || m.document) return recibirArchivo(m, usuario);
  const comando = texto.split(/\s|@/)[0].toLowerCase();
  switch (comando) {
    case "/resumen": return enviarMensaje(chatId, await textoResumen());
    case "/stock": return enviarMensaje(chatId, await textoStock());
    case "/cobrar": return enviarMensaje(chatId, await textoPorCobrar());
    case "/tasa": return enviarMensaje(chatId, await textoTasa());
    default: return enviarMensaje(chatId, `Hola ${h(usuario.nombre)}.\n\n${AYUDA}`);
  }
}

async function usuarioDeChat(chatId: string): Promise<Usuario | undefined> {
  return (await getStore().listar("usuarios")).find((u) => u.telegramId === chatId && u.estado !== "inactivo");
}

async function vincular(m: TgMensaje, texto: string) {
  const chatId = String(m.chat.id);
  // El mensaje trae el PIN: se borra siempre, salga bien o mal.
  await tg("deleteMessage", { chat_id: chatId, message_id: m.message_id }).catch(() => {});
  const partes = texto.split(/\s+/).slice(1);
  const pin = partes.pop() ?? "";
  const nombre = partes.join(" ");
  if (!nombre || !pin) return enviarMensaje(chatId, "Escríbelo así: <code>/vincular TuNombre TuPIN</code>");
  try {
    const u = await verificarCredenciales(nombre, pin);
    const store = getStore();
    // Un chat solo puede estar vinculado a un usuario.
    await store.actualizar("usuarios", (x) => x.telegramId === chatId && x.id !== u.id, { telegramId: "" });
    await store.actualizar("usuarios", (x) => x.id === u.id, { telegramId: chatId });
    return enviarMensaje(chatId, `✅ Listo, ${h(u.nombre)}. Tu Telegram quedó vinculado a <b>${h(config.negocio)}</b>.\n\n${AYUDA}`);
  } catch (e) {
    return enviarMensaje(chatId, `❌ ${h(e instanceof Error ? e.message : "No se pudo vincular")}`);
  }
}

// ---------- Fotos: capture de pago o factura ----------

async function recibirArchivo(m: TgMensaje, usuario: Usuario) {
  const chatId = String(m.chat.id);
  if (!lectorDisponible()) return enviarMensaje(chatId, "La lectura con IA no está activada en este negocio.");
  const archivo = m.photo?.length
    ? { fileId: m.photo[m.photo.length - 1].file_id, mime: "image/jpeg" } // la última es la de mayor resolución
    : { fileId: m.document!.file_id, mime: m.document!.mime_type ?? "" };
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(archivo.mime)) {
    return enviarMensaje(chatId, "Solo puedo leer fotos (JPG/PNG) o PDF.");
  }
  const p: Pendiente = {
    id: nuevoId("P"), tipo: "?", estado: "esperando", creado: marcaTiempo(), chatId, usuario: usuario.nombre,
    archivo: JSON.stringify({ ...archivo, nota: m.caption ?? "" }), datos: "",
  };
  await getStore().agregar("pendientes", [p]);
  return enviarMensaje(chatId, "¿Qué es esto?", [[
    { text: "💵 Venta (capture de pago)", callback_data: `leer:pago:${p.id}` },
    { text: "🧾 Gasto (factura)", callback_data: `leer:factura:${p.id}` },
  ], [{ text: "Cancelar", callback_data: `no:${p.id}` }]]);
}

async function manejarBoton(cb: TgCallback) {
  // Responder enseguida para que Telegram quite el "cargando" del botón.
  await tg("answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {});
  const chatId = String(cb.from.id);
  const msgId = cb.message?.message_id;
  const usuario = await usuarioDeChat(chatId);
  if (!usuario || !msgId) return;
  const [accion, a, b] = (cb.data ?? "").split(":");
  const id = accion === "leer" ? b : a;
  const store = getStore();
  const p = (await store.listar("pendientes")).find((x) => x.id === id && x.chatId === chatId);
  if (!p) return editarMensaje(chatId, msgId, "Este registro ya no existe.");

  if (accion === "no") {
    await store.actualizar("pendientes", (x) => x.id === id, { estado: "descartado" });
    return editarMensaje(chatId, msgId, "❌ Descartado. No se registró nada.");
  }

  if (accion === "leer") {
    if (p.estado !== "esperando") return; // Telegram reintentó el mismo botón
    const tipo = a === "factura" ? "factura" : "pago";
    await store.actualizar("pendientes", (x) => x.id === id, { estado: "leyendo" });
    await editarMensaje(chatId, msgId, `⏳ Leyendo ${tipo === "pago" ? "el capture" : "la factura"}…`);
    try {
      const arch = JSON.parse(p.archivo) as { fileId: string; mime: string };
      const datos = await leerDocumento(tipo, { datos: await descargarArchivo(arch.fileId), mime: arch.mime }, { categoriasGasto: config.plantilla.categoriasGasto });
      if (!datos.legible) {
        await store.actualizar("pendientes", (x) => x.id === id, { estado: "descartado" });
        return editarMensaje(chatId, msgId, "No pude leerlo: no parece un comprobante o factura legible. Prueba con otra foto.");
      }
      const tipoReg = tipo === "pago" ? "venta" : "gasto";
      await store.actualizar("pendientes", (x) => x.id === id, { tipo: tipoReg, estado: "leido", datos: JSON.stringify(datos) });
      const { valor: tasa } = await tasaNegocio();
      return editarMensaje(chatId, msgId,
        tipo === "pago" ? resumenPago(datos as PagoLeido, tasa, JSON.parse(p.archivo).nota) : resumenFactura(datos as FacturaLeida, tasa),
        [[{ text: "✅ Registrar", callback_data: `ok:${id}` }, { text: "❌ Descartar", callback_data: `no:${id}` }]]);
    } catch (e) {
      await store.actualizar("pendientes", (x) => x.id === id, { estado: "esperando" });
      return editarMensaje(chatId, msgId, `❌ ${h(e instanceof Error ? e.message : "Error al leer")}`, [[
        { text: "Reintentar", callback_data: `leer:${a}:${id}` }, { text: "Cancelar", callback_data: `no:${id}` },
      ]]);
    }
  }

  if (accion === "ok") {
    if (p.estado === "confirmado") return;
    if (p.estado !== "leido") return editarMensaje(chatId, msgId, "Ese registro todavía no está listo.");
    try {
      const nota = (JSON.parse(p.archivo) as { nota?: string }).nota ?? "";
      const texto = p.tipo === "venta"
        ? await confirmarVenta(JSON.parse(p.datos) as PagoLeido, nota, p.id, usuario.nombre)
        : await confirmarGasto(JSON.parse(p.datos) as FacturaLeida, p.id, usuario.nombre);
      await store.actualizar("pendientes", (x) => x.id === id, { estado: "confirmado" });
      return editarMensaje(chatId, msgId, texto);
    } catch (e) {
      return editarMensaje(chatId, msgId, `❌ ${h(e instanceof Error ? e.message : "No se pudo registrar")}`, [[
        { text: "Reintentar", callback_data: `ok:${id}` }, { text: "Descartar", callback_data: `no:${id}` },
      ]]);
    }
  }
}

function resumenPago(d: PagoLeido, tasa: number, nota: string) {
  const usd = d.moneda === "USD" ? d.monto : d.monto / tasa;
  return [
    "💵 <b>Venta por registrar</b>",
    `Monto: <b>${d.moneda === "USD" ? formatoUsd(d.monto) : formatoBs(d.monto)}</b> (≈ ${formatoUsd(usd)})`,
    `Método: ${h(d.tipo)}${d.bancoOrigen ? ` · ${h(d.bancoOrigen)}` : ""}`,
    d.referencia && `Referencia: <code>${h(d.referencia)}</code>`,
    d.emisor && `Cliente: ${h(d.emisor)}`,
    `Detalle: ${h(nota || "Venta por Telegram")} <i>(escribe el detalle como texto de la foto)</i>`,
    "\n¿La registro?",
  ].filter(Boolean).join("\n");
}

function resumenFactura(d: FacturaLeida, tasa: number) {
  const usd = d.moneda === "USD" ? d.total : d.total / tasa;
  const items = d.items.slice(0, 8).map((i) => `• ${i.cantidad} × ${h(i.descripcion)}`);
  if (d.items.length > 8) items.push(`• … y ${d.items.length - 8} más`);
  return [
    "🧾 <b>Gasto por registrar</b>",
    `Proveedor: ${h(d.proveedor || "—")}${d.rif ? ` (${h(d.rif)})` : ""}`,
    d.nroFactura && `Factura: ${h(d.nroFactura)}`,
    `Total: <b>${d.moneda === "USD" ? formatoUsd(d.total) : formatoBs(d.total)}</b> (≈ ${formatoUsd(usd)})`,
    `Categoría: ${h(d.categoriaSugerida)}`,
    items.length && items.join("\n"),
    "\n¿Lo registro? Los productos que reconozca se suman al inventario.",
  ].filter(Boolean).join("\n");
}

async function confirmarVenta(d: PagoLeido, nota: string, requestId: string, usuario: string) {
  const { valor: tasa } = await tasaNegocio();
  const metodo = d.tipo === "Efectivo" ? (d.moneda === "USD" ? "Efectivo USD" : "Efectivo Bs") : d.tipo;
  const usd = redondear(d.moneda === "USD" ? d.monto : d.monto / tasa);
  const v = await registrarVenta({
    items: [{ descripcion: nota || "Venta por Telegram", cantidad: 1, precioUsd: usd }],
    pago: {
      moneda: d.moneda, monto: d.monto, metodo: (METODOS_PAGO as readonly string[]).includes(metodo) ? metodo : "Otro",
      banco: d.bancoOrigen, referencia: d.referencia,
    },
    cliente: d.emisor, tasa, origen: "telegram", requestId,
  }, usuario);
  return `✅ Venta registrada: <b>${formatoUsd(v.totalUsd)}</b> (${formatoBs(v.montoBs)})\n<code>${v.id}</code>`;
}

async function confirmarGasto(d: FacturaLeida, requestId: string, usuario: string) {
  const productos = (await getStore().listar("productos")).filter((p) => p.controlaStock === "sí" && p.activo !== "no");
  // El IVA se reparte en el costo unitario (igual que en la app web).
  const factorIva = d.subtotal > 0 && d.total > 0 ? d.total / d.subtotal : 1;
  const g = await registrarGasto({
    concepto: d.conceptoSugerido || `Compra a ${d.proveedor}`,
    categoria: config.plantilla.categoriasGasto.includes(d.categoriaSugerida) ? d.categoriaSugerida : "Otros",
    proveedor: d.proveedor, rif: d.rif, nroFactura: d.nroFactura, moneda: d.moneda, monto: d.total,
    metodo: (METODOS_PAGO as readonly string[]).includes(d.metodoPago) ? d.metodoPago : "",
    items: d.items.filter((i) => i.cantidad > 0).map((i) => ({
      productoId: sugerirProducto(i.descripcion, productos),
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      costoUnit: redondear((i.precioUnitario || i.total / i.cantidad) * factorIva, 4),
    })),
    sumarInventario: true, origen: "telegram", requestId,
  }, usuario);
  const entraron = (await getStore().listar("movimientos")).filter((m) => m.referencia === g.id);
  return `✅ Gasto registrado: <b>${formatoUsd(g.montoUsd)}</b> (${formatoBs(g.montoBs)})\n` +
    (entraron.length ? `📦 Al inventario: ${entraron.map((m) => `${m.cantidad} ${h(m.producto)}`).join(", ")}\n` : "") +
    `<code>${g.id}</code>`;
}

// ---------- Textos de consulta ----------

export async function textoResumen() {
  const store = getStore();
  const [ventas, gastos, detalle, t] = await Promise.all([
    store.listar("ventas"), store.listar("gastos"), store.listar("detalleVentas"), tasaNegocio().catch(() => null),
  ]);
  const r = calcularResumen(ventas, gastos, detalle);
  const linea = (p: (typeof r.periodos)[number]) =>
    `<b>${p.nombre}</b>: ventas ${formatoUsd(p.ventasUsd)} · gastos ${formatoUsd(p.gastosUsd)} · ganancia <b>${formatoUsd(p.gananciaUsd)}</b> (${p.nVentas} ventas)`;
  const [hoy, , semana, , mes] = r.periodos;
  return [
    `📊 <b>${h(config.negocio)}</b>`,
    linea(hoy), linea(semana), linea(mes),
    r.porCobrarUsd > 0 ? `⏱ Por cobrar: <b>${formatoUsd(r.porCobrarUsd)}</b> (${r.nPendientes})` : "",
    r.topSemana[0] ? `🏆 Más vendido de la semana: ${h(r.topSemana[0].producto)}` : "",
    t ? `💱 Tasa: ${formatoTasa(t.valor)} Bs` : "",
  ].filter(Boolean).join("\n");
}

export async function textoStock() {
  const bajos = (await stockActual()).filter((l) => l.estado !== "OK");
  if (!bajos.length) return "✅ Todo el inventario está sobre el mínimo.";
  return "📦 <b>Para reponer</b>\n" + bajos.map((l) =>
    `${l.estado === "Agotado" ? "⛔" : "⚠️"} ${h(l.producto.nombre)}: <b>${l.stock}</b> ${h(l.producto.unidad)} (mín. ${l.producto.stockMinimo})`).join("\n");
}

async function textoPorCobrar() {
  const pend = (await getStore().listar("ventas")).filter((v) => !v.anulado && v.estado === "pendiente");
  if (!pend.length) return "🎉 No hay cuentas por cobrar.";
  const total = pend.reduce((s, v) => s + v.totalUsd, 0);
  return `⏱ <b>Por cobrar: ${formatoUsd(total)}</b>\n` + pend.slice(0, 20).map((v) =>
    `• ${h(v.cliente || "Sin nombre")}: ${formatoUsd(v.totalUsd)}${v.fechaEsperada ? ` (paga ${v.fechaEsperada.split("-").reverse().join("/")})` : ""}`).join("\n");
}

async function textoTasa() {
  const t = await tasaDelDia();
  return `💱 <b>Tasa BCV</b> (${t.fecha})\nDólar: <b>${formatoTasa(t.usd)}</b> Bs\nEuro: <b>${t.eur ? formatoTasa(t.eur) : "—"}</b> Bs\n<i>${h(t.fuente)}</i>`;
}

/** Reporte diario para los administradores (lo dispara la función programada de Netlify o n8n). */
export async function textoReporteDiario() {
  return `🌙 <b>Cierre del día</b>\n\n${await textoResumen()}\n\n${await textoStock()}`;
}
