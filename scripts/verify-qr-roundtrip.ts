/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Verificación del ciclo cerrado del código QR
 * ─────────────────────────────────────────────────────────────────────────────
 * Comprueba que el QR que la app genera para el tutor es exactamente el que el
 * lector del docente sabe decodificar. Para ello:
 *
 *   1. Genera el PNG con las MISMAS opciones que `src/app/api/qr/route.ts`.
 *   2. Decodifica ese PNG a píxeles (decodificador mínimo incluido abajo).
 *   3. Lo reduce a 480 px de lado, igual que hace `CameraReader` antes de
 *      analizar cada fotograma (`JSQR_MAX_SIDE`).
 *   4. Lo pasa por `jsqr`, el mismo motor de respaldo que corre en el móvil del
 *      docente cuando el navegador no trae `BarcodeDetector` (iOS/Safari,
 *      Firefox).
 *   5. Comprueba que lo leído coincide con lo emitido y supera `QR_PATTERN`.
 *
 * Esto cubre la parte del escáner que no se puede probar sin cámara: la cadena
 * de decodificación. Lo único que queda fuera es la captura de vídeo en sí,
 * que depende del navegador y del permiso del usuario.
 *
 * Uso:  npm run verify:qr
 *       npm run verify:qr -- <archivo.png>   (comprueba además un PNG real
 *                                             servido por `/api/qr`)
 */
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";

import jsQR from "jsqr";
import QRCode from "qrcode";

import { QR_PATTERN } from "../src/lib/validation/schemas";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${label}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? ` → ${detail}` : ""}`);
  }
}

// ── Decodificador PNG mínimo ────────────────────────────────────────────────
// Solo cubre lo que produce la librería `qrcode`: 8 bits por canal, sin
// entrelazado. No pretende ser un decodificador general.

type Bitmap = { width: number; height: number; data: Uint8ClampedArray };

function decodePng(png: Buffer): Bitmap {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < signature.length; i++) {
    if (png[i] !== signature[i]) throw new Error("No es un PNG válido.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8]!;
      colorType = data[9]!;
      interlace = data[12]!;
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data));
    } else if (type === "IEND") {
      break;
    }

    offset += 12 + length;
  }

  if (bitDepth !== 8) throw new Error(`Profundidad no soportada: ${bitDepth}`);
  if (interlace !== 0) throw new Error("PNG entrelazado no soportado.");

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (channels === 0) throw new Error(`Tipo de color no soportado: ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8ClampedArray(width * height * 4);
  const previous = new Uint8Array(stride);
  const current = new Uint8Array(stride);

  let position = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[position++]!;
    for (let x = 0; x < stride; x++) current[x] = raw[position + x]!;
    position += stride;

    // Deshacer el filtro de la línea (especificación PNG, sección 9).
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? current[x - channels]! : 0; // izquierda
      const b = previous[x]!; // arriba
      const c = x >= channels ? previous[x - channels]! : 0; // diagonal

      let value = current[x]!;
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      current[x] = value & 0xff;
    }

    for (let x = 0; x < width; x++) {
      const source = x * channels;
      const target = (y * width + x) * 4;
      if (channels === 1) {
        const gray = current[source]!;
        out[target] = gray;
        out[target + 1] = gray;
        out[target + 2] = gray;
        out[target + 3] = 255;
      } else {
        out[target] = current[source]!;
        out[target + 1] = current[source + 1]!;
        out[target + 2] = current[source + 2]!;
        out[target + 3] = channels === 4 ? current[source + 3]! : 255;
      }
    }

    previous.set(current);
  }

  return { width, height, data: out };
}

/** Reduce la imagen como hace el canvas del lector antes de analizarla. */
function downscale(image: Bitmap, maxSide: number): Bitmap {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  if (scale === 1) return image;

  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / scale));
      const from = (sourceY * image.width + sourceX) * 4;
      const to = (y * width + x) * 4;
      data[to] = image.data[from]!;
      data[to + 1] = image.data[from + 1]!;
      data[to + 2] = image.data[from + 2]!;
      data[to + 3] = image.data[from + 3]!;
    }
  }

  return { width, height, data };
}

/** Genera el PNG con las mismas opciones que la ruta `/api/qr`. */
async function generate(code: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(code, {
    type: "png",
    width: size,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#161f49ff", light: "#ffffffff" },
  });
}

async function main() {
  console.log("\n\x1b[1m══ SeguriKids · El QR emitido ↔ el lector del docente ══\x1b[0m\n");

  const codigos = ["SK-DEMO-000101", "SK-DEMO-000201", "SK-DEMO-000202", "SK-DEMO-999999"];

  console.log("\x1b[1m1 · Ida y vuelta a tamaño de pantalla (288 px, el de la app)\x1b[0m");
  for (const codigo of codigos) {
    const png = await generate(codigo, 288);
    const imagen = decodePng(png);
    const leido = jsQR(imagen.data, imagen.width, imagen.height, {
      inversionAttempts: "dontInvert",
    });
    check(`«${codigo}» se decodifica exactamente igual`, leido?.data === codigo, leido?.data ?? "sin lectura");
  }

  console.log("\n\x1b[1m2 · A través del canvas del lector (reducido a 480 px)\x1b[0m");
  const codigo = "SK-DEMO-000101";
  for (const tamano of [240, 288, 400, 640]) {
    const png = await generate(codigo, tamano);
    const imagen = downscale(decodePng(png), 480);
    const leido = jsQR(imagen.data, imagen.width, imagen.height, {
      inversionAttempts: "dontInvert",
    });
    check(
      `credencial de ${tamano} px → canvas ${imagen.width}×${imagen.height} → se lee bien`,
      leido?.data === codigo,
      leido?.data ?? "sin lectura",
    );
  }

  console.log("\n\x1b[1m3 · El modo del lector es el correcto\x1b[0m");
  const png = await generate(codigo, 288);
  const imagen = decodePng(png);
  const sinInvertir = jsQR(imagen.data, imagen.width, imagen.height, {
    inversionAttempts: "dontInvert",
  });
  check(
    "«dontInvert» basta para un QR oscuro sobre fondo claro (el que emite la app)",
    sinInvertir?.data === codigo,
  );

  console.log("\n\x1b[1m4 · Lo leído entra limpio en la validación del servidor\x1b[0m");
  const leido = sinInvertir!.data;
  check("lo leído supera QR_PATTERN", QR_PATTERN.test(leido));
  check("lo leído no trae espacios ni saltos de línea", leido === leido.trim());
  check("lo leído ya viene en mayúsculas", leido === leido.toUpperCase());
  check(
    "el contenido es solo el identificador, nada más",
    leido === codigo && leido.length === 14,
    `${leido.length} caracteres`,
  );

  console.log("\n\x1b[1m5 · El QR no lleva datos personales\x1b[0m");
  check("no contiene «@» (ni correo ni usuario)", !leido.includes("@"));
  check("no contiene espacios (ni nombres)", !/\s/.test(leido));
  check("no contiene una URL", !/https?:/i.test(leido));
  check("no contiene JSON", !leido.includes("{") && !leido.includes(":"));
  check(
    "solo tiene el prefijo del centro y seis dígitos",
    /^SK-DEMO-\d{6}$/.test(leido),
  );

  // 6 · Un PNG real servido por la aplicación, si se indica uno.
  const archivo = process.argv[2];
  if (archivo) {
    console.log(`\n\x1b[1m6 · PNG servido por la aplicación (${archivo})\x1b[0m`);
    const servido = decodePng(readFileSync(archivo));
    check(`el archivo es una imagen de ${servido.width}×${servido.height}`, servido.width > 0);
    const canvas = downscale(servido, 480);
    const lectura = jsQR(canvas.data, canvas.width, canvas.height, {
      inversionAttempts: "dontInvert",
    });
    check(
      "el lector del docente decodifica el PNG que sirvió el servidor",
      Boolean(lectura?.data),
      lectura?.data ?? "sin lectura",
    );
    check("lo leído supera QR_PATTERN", QR_PATTERN.test(lectura?.data ?? ""));
    if (lectura) console.log(`  \x1b[2mLeído: «${lectura.data}»\x1b[0m`);
  }

  const color = failed === 0 ? "\x1b[32m" : "\x1b[31m";
  console.log(
    `\n\x1b[1m${color}Resultado: ${passed} comprobaciones correctas, ${failed} fallidas.\x1b[0m\n`,
  );

  if (failed > 0) process.exitCode = 1;
}

void main().catch((error) => {
  console.error("\n\x1b[31mLa verificación se interrumpió:\x1b[0m", error);
  process.exitCode = 1;
});
