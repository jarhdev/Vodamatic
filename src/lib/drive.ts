import { JWT } from "google-auth-library";

/**
 * Sube la foto de una factura o capture a Google Drive y devuelve el link.
 * Las cuentas de servicio no tienen espacio propio: la carpeta debe estar en una
 * Unidad compartida donde la cuenta de servicio sea "Colaborador".
 */
export async function subirADrive(nombre: string, mime: string, datos: Buffer): Promise<string> {
  const carpeta = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!carpeta || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return "";
  const jwt = new JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });
  const { token } = await jwt.getAccessToken();
  const limite = "pyme" + Math.random().toString(36).slice(2);
  const meta = JSON.stringify({ name: nombre, parents: [carpeta] });
  const cuerpo = Buffer.concat([
    Buffer.from(`--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${limite}\r\nContent-Type: ${mime}\r\n\r\n`),
    datos,
    Buffer.from(`\r\n--${limite}--`),
  ]);
  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${limite}` },
    body: cuerpo,
  });
  if (!res.ok) {
    console.error("Drive", res.status, await res.text());
    return "";
  }
  return ((await res.json()) as { webViewLink?: string }).webViewLink ?? "";
}
