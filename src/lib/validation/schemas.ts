import { z } from "zod";

import {
  EMERGENCY_PRIORITIES,
  EMERGENCY_TYPES,
  EVENT_METHODS,
  INCIDENT_SEVERITIES,
  INCIDENT_TYPES,
  RELATIONSHIPS,
  ROLES,
  STUDENT_STATUSES,
} from "@/lib/domain";

/**
 * Esquemas de validación compartidos. Toda entrada que llega al servidor
 * (server actions y route handlers) se valida aquí antes de tocar la base de
 * datos: es la protección básica contra datos inválidos del prototipo.
 */

const requiredText = (label: string, max = 120) =>
  z
    .string({ required_error: `${label} es obligatorio.` })
    .trim()
    .min(2, `${label} debe tener al menos 2 caracteres.`)
    .max(max, `${label} no puede superar ${max} caracteres.`);

const optionalText = (max = 240) =>
  z
    .string()
    .trim()
    .max(max, `El texto no puede superar ${max} caracteres.`)
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined));

const phone = z
  .string()
  .trim()
  .regex(/^[\d\s()+-]{8,20}$/, "Introduce un teléfono válido (8 a 20 dígitos).")
  .optional()
  .or(z.literal(""))
  .transform((value) => (value ? value : undefined));

export const loginSchema = z.object({
  email: z
    .string({ required_error: "El correo es obligatorio." })
    .trim()
    .toLowerCase()
    .email("Introduce un correo con formato válido."),
  password: z
    .string({ required_error: "La contraseña es obligatoria." })
    .min(4, "La contraseña debe tener al menos 4 caracteres."),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** Formato del identificador que viaja dentro del QR: SK-DEMO-000123 */
export const QR_PATTERN = /^SK-DEMO-\d{6}$/;

export const qrCodeSchema = z
  .string({ required_error: "Introduce o escanea un código." })
  .trim()
  .transform((value) => value.toUpperCase().replace(/\s+/g, ""))
  .refine((value) => QR_PATTERN.test(value), {
    message: "El código debe tener el formato SK-DEMO-000000.",
  });

export const studentSchema = z.object({
  firstName: requiredText("El nombre", 60),
  lastName: requiredText("El apellido", 60),
  group: requiredText("El grupo", 40),
  tutorId: z.string({ required_error: "Selecciona un tutor." }).min(1, "Selecciona un tutor."),
  status: z.enum(STUDENT_STATUSES).default("ABSENT"),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa el formato AAAA-MM-DD.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  bloodType: optionalText(8),
  allergies: optionalText(200),
  notes: optionalText(400),
});
export type StudentInput = z.infer<typeof studentSchema>;

export const authorizedPersonSchema = z.object({
  name: requiredText("El nombre completo", 90),
  relationship: z.enum(RELATIONSHIPS, { required_error: "Selecciona la relación." }),
  phone,
  documentTail: z
    .string()
    .trim()
    .regex(/^\d{3,6}$/, "Escribe entre 3 y 6 dígitos finales de la identificación.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : undefined)),
  notes: optionalText(240),
  /** Alumnos a los que queda asociada la persona. */
  studentIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un alumno."),
});
export type AuthorizedPersonInput = z.infer<typeof authorizedPersonSchema>;

export const manualAttendanceSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un alumno."),
  type: z.enum(["ENTRY", "EXIT"]),
  method: z.enum(EVENT_METHODS).default("MANUAL"),
  authorizedPersonId: z.string().min(1).optional(),
  note: optionalText(200),
});
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;

export const confirmPickupSchema = z.object({
  authorizedPersonId: z.string().min(1, "Falta la persona autorizada."),
  studentIds: z.array(z.string().min(1)).min(1, "Selecciona al menos un alumno para entregar."),
  note: optionalText(200),
});
export type ConfirmPickupInput = z.infer<typeof confirmPickupSchema>;

export const emergencySchema = z.object({
  type: z.enum(EMERGENCY_TYPES, { required_error: "Selecciona el tipo de emergencia." }),
  title: requiredText("El título", 90),
  message: z
    .string({ required_error: "El mensaje es obligatorio." })
    .trim()
    .min(10, "Describe la situación con al menos 10 caracteres.")
    .max(600, "El mensaje no puede superar 600 caracteres."),
  priority: z.enum(EMERGENCY_PRIORITIES),
});
export type EmergencyInput = z.infer<typeof emergencySchema>;

export const incidentSchema = z.object({
  type: z.enum(INCIDENT_TYPES, { required_error: "Selecciona el tipo de incidencia." }),
  severity: z.enum(INCIDENT_SEVERITIES).default("MEDIUM"),
  description: z
    .string({ required_error: "La descripción es obligatoria." })
    .trim()
    .min(10, "Describe la incidencia con al menos 10 caracteres.")
    .max(600, "La descripción no puede superar 600 caracteres."),
  studentId: z.string().min(1).optional(),
  authorizedPersonId: z.string().min(1).optional(),
});
export type IncidentInput = z.infer<typeof incidentSchema>;

export const messageSchema = z.object({
  conversationId: z.string().min(1, "Falta la conversación."),
  body: z
    .string({ required_error: "Escribe un mensaje." })
    .trim()
    .min(1, "Escribe un mensaje.")
    .max(1000, "El mensaje no puede superar 1000 caracteres."),
});
export type MessageInput = z.infer<typeof messageSchema>;

export const reportFilterSchema = z.object({
  from: z.string().trim().optional(),
  to: z.string().trim().optional(),
  group: z.string().trim().optional(),
  studentId: z.string().trim().optional(),
  type: z.string().trim().optional(),
});

/**
 * Alta de usuarios del sistema (solo dirección).
 *
 * La contraseña inicial la define quien da el alta.
 * ⚠️ DEMO: en producción esto sería una invitación por correo con cambio
 * obligatorio en el primer acceso, nunca una contraseña escrita por un tercero.
 */
export const userSchema = z
  .object({
    name: requiredText("El nombre completo", 90),
    email: z
      .string({ required_error: "El correo es obligatorio." })
      .trim()
      .toLowerCase()
      .email("Introduce un correo con formato válido."),
    password: z
      .string({ required_error: "La contraseña es obligatoria." })
      .min(8, "La contraseña debe tener al menos 8 caracteres.")
      .max(72, "La contraseña no puede superar 72 caracteres."),
    role: z.enum(ROLES, { required_error: "Selecciona un rol." }),
    phone,
    jobTitle: optionalText(80),
    /** Relación con el menor: solo aplica al rol PARENT. */
    relationship: z.enum(RELATIONSHIPS).optional(),
  })
  .superRefine((data, ctx) => {
    // El cargo describe a quien trabaja en el centro; un tutor no tiene cargo.
    if (data.role !== "PARENT" && !data.jobTitle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["jobTitle"],
        message: "Indica el cargo dentro del centro.",
      });
    }
    if (data.role === "PARENT" && !data.relationship) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["relationship"],
        message: "Indica la relación con el menor para generar su credencial.",
      });
    }
  });
export type UserInput = z.infer<typeof userSchema>;

/** Convierte los errores de Zod en un mapa campo → primer mensaje. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
