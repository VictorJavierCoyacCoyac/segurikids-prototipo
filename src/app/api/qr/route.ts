import QRCode from "qrcode";

import { getCurrentUser } from "@/lib/auth/session";
import { QR_PATTERN } from "@/lib/validation/schemas";

/**
 * Genera la imagen PNG de un código QR.
 *
 * SEGURIDAD: el QR contiene ÚNICAMENTE el identificador opaco de la persona
 * autorizada (p. ej. `SK-DEMO-000101`). Nunca nombres, teléfonos ni datos del
 * menor: si alguien fotografía el código, no obtiene información personal, solo
 * una referencia que el sistema debe resolver contra la base de datos.
 *
 * Requiere sesión: aunque el contenido no sea sensible, el endpoint no queda
 * abierto a Internet. Vale cualquiera de las sesiones abiertas (la credencial
 * la consultan tanto el tutor como dirección), por lo que no se fija un área.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").toUpperCase().trim();
  const size = Math.min(640, Math.max(120, Number(searchParams.get("size") ?? 288) || 288));

  if (!QR_PATTERN.test(code)) {
    return new Response("Identificador con formato inválido", { status: 400 });
  }

  const png = await QRCode.toBuffer(code, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#161f49ff", light: "#ffffffff" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="${code}.png"`,
    },
  });
}
