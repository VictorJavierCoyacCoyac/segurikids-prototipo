/**
 * Términos de uso y aviso de privacidad del prototipo.
 *
 * El texto vive aquí y no en la plantilla para que la pantalla pública
 * (`/terminos`) y la pantalla de aceptación obligatoria rendericen exactamente
 * el mismo contenido: si se editan en dos sitios, acaban divergiendo y lo que
 * el usuario acepta deja de coincidir con lo que puede consultar después.
 *
 * ⚠️ DEMO: redacción orientativa de un prototipo académico. NO es un documento
 * legal revisado. Antes de un uso real debe redactarlo quien tenga competencia
 * jurídica y adaptarse a la normativa de protección de datos aplicable al
 * centro (en México, la LFPDPPP y su reglamento), incluyendo responsable del
 * tratamiento, finalidades, plazos de conservación y procedimiento de ejercicio
 * de derechos.
 */

/**
 * Versión vigente. Al cambiarla, toda aceptación anterior queda obsoleta y el
 * sistema vuelve a pedir el consentimiento en el siguiente acceso.
 */
export const TERMS_VERSION = "2026.10";

/** Fecha de publicación de la versión vigente (texto mostrado al usuario). */
export const TERMS_UPDATED_AT = "26 de octubre de 2026";

export type TermsSection = {
  id: string;
  title: string;
  paragraphs: string[];
  /** Puntos destacados que se muestran como lista. */
  bullets?: string[];
};

export const TERMS_SECTIONS: TermsSection[] = [
  {
    id: "objeto",
    title: "1. Objeto del servicio",
    paragraphs: [
      "SeguriKids es una herramienta de control de acceso para centros preescolares. Su finalidad es registrar las entradas y salidas del alumnado y verificar que la persona que recoge a un menor cuenta con autorización vigente del tutor y del centro.",
      "El uso de la plataforma no sustituye la responsabilidad del personal del centro: la validación en pantalla es un apoyo a la decisión, y es el personal quien confirma la entrega presencialmente.",
    ],
  },
  {
    id: "cuentas",
    title: "2. Cuentas y responsabilidad de acceso",
    paragraphs: [
      "Las cuentas son personales e intransferibles. Las crea la dirección del centro y quedan asociadas a un rol (dirección, personal escolar o padre/tutor) que determina a qué información puede acceder cada persona.",
    ],
    bullets: [
      "No compartas tu contraseña ni dejes la sesión abierta en un dispositivo compartido.",
      "Avisa de inmediato a la dirección del centro si sospechas que alguien más usa tu cuenta.",
      "Cada acceso, escaneo y registro queda asociado a la cuenta que lo realizó.",
    ],
  },
  {
    id: "credencial",
    title: "3. Credencial QR de recogida",
    paragraphs: [
      "Cada persona autorizada recibe un identificador propio en forma de código QR. El código no contiene datos personales: es únicamente una referencia opaca que el sistema resuelve contra su base de datos en el momento del escaneo.",
      "Aun así, la credencial es un elemento de seguridad. Compartir una captura del código con terceros equivale a facilitar el acceso a la recogida del menor.",
    ],
    bullets: [
      "No publiques ni reenvíes tu código QR.",
      "Solicita a la dirección la baja inmediata del código si pierdes el dispositivo donde lo consultas.",
      "El personal del centro puede pedir una identificación oficial adicional antes de entregar al menor.",
    ],
  },
  {
    id: "datos",
    title: "4. Datos que trata la plataforma",
    paragraphs: [
      "Para cumplir su finalidad, el sistema trata los datos de identificación del alumnado y de las personas autorizadas, el parentesco declarado, datos de contacto y el registro de entradas, salidas y escaneos con fecha, hora y responsable.",
      "Estos datos se utilizan exclusivamente para el control de acceso, la comunicación entre el centro y la familia, y la trazabilidad de cada movimiento. No se ceden a terceros ni se emplean con fines comerciales.",
    ],
  },
  {
    id: "camara",
    title: "5. Uso de la cámara y del voceo por voz",
    paragraphs: [
      "En los dispositivos del personal, el lector de códigos usa la cámara únicamente mientras la pantalla del escáner está abierta. Las imágenes se procesan en el propio dispositivo para localizar el código y no se almacenan ni se envían a ningún servidor.",
      "El aviso por voz (voceo) reproduce en el dispositivo del personal el nombre del alumno y la persona que ha llegado a recogerlo, para avisar al aula. Es audible en el entorno inmediato, por lo que debe utilizarse con criterio en espacios con público.",
    ],
  },
  {
    id: "derechos",
    title: "6. Derechos de las familias",
    paragraphs: [
      "El tutor puede consultar en cualquier momento el historial de entradas y salidas de sus hijos, la lista de personas autorizadas y los avisos recibidos, así como solicitar la rectificación o la revocación de una autorización.",
      "Las solicitudes de acceso, rectificación, cancelación u oposición se dirigen a la dirección del centro, que es responsable del tratamiento.",
    ],
  },
  {
    id: "prototipo",
    title: "7. Naturaleza de prototipo",
    paragraphs: [
      "Esta instalación es un prototipo académico de demostración. Todos los datos que contiene son ficticios y están marcados como DEMO; no corresponden a personas reales.",
      "Las medidas de seguridad implementadas son suficientes para una demostración, pero no para un entorno productivo: la autenticación, el cifrado en reposo, la gestión de secretos, la retención de datos y el consentimiento verificable deben endurecerse antes de cualquier uso con datos reales.",
    ],
  },
];

/** Resumen de una línea para pantallas donde no cabe el texto completo. */
export const TERMS_SUMMARY =
  "Uso personal de la cuenta, credencial QR no transferible, tratamiento de datos limitado al control de acceso y a la comunicación con la familia.";
