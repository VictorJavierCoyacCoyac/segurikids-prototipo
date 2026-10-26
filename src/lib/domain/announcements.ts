import { relationshipLabel } from "./roles";

/**
 * Voceo de recogida y asistente guionizado.
 *
 * El personal del centro necesita avisar al aula de que ya han llegado por un
 * alumno. En lugar de un altavoz manual, el dispositivo que escanea compone el
 * aviso y lo reproduce con la voz del navegador (Web Speech API).
 *
 * DECISIONES:
 *  · Solo se vocean las entregas AUTORIZADAS. Un intento bloqueado no se
 *    anuncia en voz alta: avisar públicamente de un acceso denegado expone a la
 *    persona y al menor. Ese caso se resuelve en pantalla, con el personal.
 *  · El aviso dice el nombre del alumno, su grupo y quién lo espera. No incluye
 *    teléfonos, domicilios, identificadores QR ni ningún otro dato.
 *  · El asistente es GUIONIZADO: coincidencia por palabras clave sobre un
 *    catálogo cerrado de respuestas. No hay modelo de lenguaje, ni llamadas a
 *    servicios externos, ni datos que salgan del dispositivo.
 */

export type AnnouncementTarget = { name: string; group: string };

/** Datos mínimos para construir un voceo. */
export type AnnouncementInput = {
  students: AnnouncementTarget[];
  personName: string;
  relationship?: string | null;
};

/** Texto que se lee en voz alta y se muestra en pantalla. */
export function buildAnnouncement({
  students,
  personName,
  relationship,
}: AnnouncementInput): string {
  if (students.length === 0) return "";

  const groups = [...new Set(students.map((student) => student.group))];
  const groupPart =
    groups.length === 1 ? `Atención, grupo ${groups[0]}.` : `Atención, ${groups.join(" y ")}.`;

  const names = formatList(students.map((student) => student.name));
  const subject = `Ya llegaron por ${names}.`;

  const who = relationship
    ? `${personName}, ${relationshipLabel(relationship).toLowerCase()},`
    : `${personName}`;

  const closing =
    students.length === 1
      ? "Favor de acompañarlo a la puerta de salida."
      : "Favor de acompañarlos a la puerta de salida.";

  return `${groupPart} ${subject} ${who} espera en recepción. ${closing}`;
}

/** Une nombres en lenguaje natural: «A», «A y B», «A, B y C». */
export function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]!}`;
}

// ── Asistente guionizado ────────────────────────────────────────────────────

/** Contexto de la jornada que el asistente puede citar. */
export type AssistantContext = {
  inCampus: number;
  offCampus: number;
  absent: number;
  pending: number;
  entriesToday: number;
  exitsToday: number;
  activeAlerts: number;
  schoolName: string;
};

export type AssistantReply = {
  /** Respuesta en texto. */
  text: string;
  /** Sugerencias de seguimiento que se ofrecen como botones. */
  suggestions?: string[];
  /** Texto que debe vocearse además de mostrarse. */
  speak?: string;
};

type Intent = {
  id: string;
  keywords: string[];
  reply: (context: AssistantContext) => AssistantReply;
};

/** Preguntas que se ofrecen de entrada. */
export const ASSISTANT_SUGGESTIONS = [
  "¿Cuántos alumnos siguen en el plantel?",
  "¿Cómo registro una salida?",
  "La cámara no enciende",
  "El código no es reconocido",
];

const INTENTS: Intent[] = [
  {
    id: "saludo",
    keywords: ["hola", "buenas", "buenos dias", "buenas tardes", "ayuda", "que puedes hacer"],
    reply: (context) => ({
      text: `Soy el asistente de voceo de ${context.schoolName}. Puedo vocear la llegada de una familia, resumirte la jornada y recordarte el protocolo de entrega.`,
      suggestions: ASSISTANT_SUGGESTIONS,
    }),
  },
  {
    id: "en-plantel",
    keywords: [
      "cuantos alumnos",
      "en plantel",
      "siguen dentro",
      "quedan",
      "resumen",
      "como va la jornada",
      "jornada",
    ],
    reply: (context) => ({
      text: `Ahora mismo hay ${context.inCampus} alumno(s) en el plantel, ${context.offCampus} ya entregado(s), ${context.absent} ausente(s) y ${context.pending} sin registro. Hoy se han registrado ${context.entriesToday} entradas y ${context.exitsToday} salidas.`,
      suggestions: ["¿Hay alertas activas?", "¿Cómo registro una salida?"],
    }),
  },
  {
    id: "alertas",
    keywords: ["alerta", "emergencia", "simulacro", "incidencia"],
    reply: (context) => ({
      text:
        context.activeAlerts > 0
          ? `Hay ${context.activeAlerts} alerta(s) activa(s). Consulta «Alertas e incidencias» y sigue el protocolo del centro; la dirección es quien puede cerrarlas.`
          : "No hay alertas activas. Si necesitas abrir una, usa «Alertas e incidencias»: el aviso llega a dirección de inmediato.",
      suggestions: ["¿Cuántos alumnos siguen en el plantel?"],
    }),
  },
  {
    id: "salida",
    keywords: ["registro una salida", "registrar salida", "entregar", "entrega", "recoger"],
    reply: () => ({
      text: "Abre el escáner, lee el QR del tutor y espera el veredicto. Si es «Autorizado», desmarca a quien no salga ahora y pulsa «Confirmar entrega»: el sistema cambia el estado, avisa al tutor y lo registra en la auditoría.",
      suggestions: ["El código no es reconocido", "¿Cómo registro una entrada?"],
    }),
  },
  {
    id: "entrada",
    keywords: ["registro una entrada", "registrar entrada", "llegada", "entrada"],
    reply: () => ({
      text: "Usa «Registrar entrada» y marca a los alumnos que van llegando. La entrada no exige QR porque el menor llega acompañado; la validación estricta se aplica en la salida.",
      suggestions: ["¿Cómo registro una salida?"],
    }),
  },
  {
    id: "camara",
    keywords: ["camara", "cámara", "no enciende", "no funciona la camara", "permiso"],
    reply: () => ({
      text: "La cámara solo está disponible en conexiones seguras (https) o en localhost: por IP local el navegador la bloquea. Abre el prototipo por su enlace https, concede el permiso cuando lo pida y, si aún falla, usa la entrada manual del código: la validación es la misma.",
      suggestions: ["El código no es reconocido"],
    }),
  },
  {
    id: "codigo",
    keywords: [
      "codigo no",
      "no reconocido",
      "no autorizado",
      "rechazado",
      "no existe",
      "suspendida",
    ],
    reply: () => ({
      text: "No entregues al alumno. Verifica la identidad con una identificación oficial, avisa a la dirección y reporta la incidencia desde el propio veredicto. El intento queda registrado en la auditoría con hora y responsable.",
      suggestions: ["¿Hay alertas activas?"],
    }),
  },
  {
    id: "voceo",
    keywords: ["vocear", "voceo", "repetir", "repite", "altavoz", "volumen", "voz"],
    reply: () => ({
      text: "Puedo vocear cualquier aviso: escribe «vocea:» seguido del texto. El voceo se reproduce en el altavoz de ESTE dispositivo; no se envía a ningún sitio. Con el botón de silencio dejo de hablar y solo muestro el texto.",
      suggestions: ["vocea: Ya pueden pasar por los niños de Kínder A"],
    }),
  },
  {
    id: "privacidad",
    keywords: ["privacidad", "datos", "grabando", "graba", "terminos", "términos"],
    reply: () => ({
      text: "No grabo audio ni vídeo. Los fotogramas de la cámara se analizan en el dispositivo y se descartan, y el voceo solo dice el nombre del alumno, su grupo y quién lo espera. El texto completo está en «Términos y aviso de privacidad».",
    }),
  },
];

/** Prefijo con el que se pide vocear un texto literal. */
const SPEAK_PREFIX = /^(vocea|vocear|di|anuncia)\s*:\s*/i;

/**
 * Resuelve la respuesta del asistente para un mensaje del operador.
 * Determinista: el mismo texto produce siempre la misma respuesta.
 */
export function assistantReply(message: string, context: AssistantContext): AssistantReply {
  const trimmed = message.trim();

  const speakMatch = trimmed.match(SPEAK_PREFIX);
  if (speakMatch) {
    const text = trimmed.slice(speakMatch[0].length).trim();
    if (!text) {
      return {
        text: "Dime qué quieres que vocee, por ejemplo: «vocea: ya pueden pasar por los niños de Kínder A».",
      };
    }
    return { text: `Voceando: «${text}»`, speak: text };
  }

  const normalized = normalize(trimmed);
  for (const intent of INTENTS) {
    if (intent.keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      return intent.reply(context);
    }
  }

  return {
    text: "No tengo una respuesta guionizada para eso. Soy un asistente de demostración con un catálogo cerrado de respuestas: puedo vocear avisos, resumir la jornada y recordar el protocolo de entrega.",
    suggestions: ASSISTANT_SUGGESTIONS,
  };
}

/** Minúsculas sin acentos ni signos, para comparar palabras clave. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[¿?¡!.,;:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
