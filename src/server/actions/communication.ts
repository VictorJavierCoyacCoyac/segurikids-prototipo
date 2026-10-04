"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { fieldErrors, messageSchema } from "@/lib/validation/schemas";
import { sendMessage, startConversation } from "@/server/services/messages";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/services/notifications";

import { errorState, successState, toErrorState, type ActionState } from "./types";

/** Comunicación escuela ↔ familia y centro de notificaciones. */

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();

    const parsed = messageSchema.safeParse({
      conversationId: formData.get("conversationId"),
      body: formData.get("body"),
    });
    if (!parsed.success) {
      return errorState("Revisa el mensaje.", fieldErrors(parsed.error));
    }

    await sendMessage(parsed.data, user);

    revalidatePath("/app/mensajes");
    revalidatePath(`/app/mensajes/${parsed.data.conversationId}`);
    revalidatePath("/staff/mensajes");
    revalidatePath(`/staff/mensajes/${parsed.data.conversationId}`);

    return successState("Mensaje enviado.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function startConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (user.role !== "PARENT") {
      return errorState("Solo un tutor puede iniciar una conversación desde la app familiar.");
    }

    const subject = String(formData.get("subject") ?? "").trim();
    const staffId = String(formData.get("staffId") ?? "");
    const body = String(formData.get("body") ?? "").trim();

    const errors: Record<string, string> = {};
    if (subject.length < 3) errors.subject = "Escribe un asunto de al menos 3 caracteres.";
    if (!staffId) errors.staffId = "Selecciona a la persona destinataria.";
    if (body.length < 3) errors.body = "Escribe un mensaje de al menos 3 caracteres.";
    if (Object.keys(errors).length > 0) {
      return errorState("Revisa los datos del mensaje.", errors);
    }

    await startConversation({ subject, staffId, body }, user);

    revalidatePath("/app/mensajes");
    revalidatePath("/staff/mensajes");

    return successState("Conversación iniciada. El centro recibirá tu mensaje.");
  } catch (error) {
    return toErrorState(error);
  }
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const notificationId = String(formData.get("notificationId") ?? "");
  if (!notificationId) return;

  await markNotificationRead(user.id, notificationId);
  revalidatePath("/app/notificaciones");
  revalidatePath("/app");
  revalidatePath("/staff");
  revalidatePath("/admin");
}

export async function markAllNotificationsReadAction(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    const count = await markAllNotificationsRead(user.id);

    revalidatePath("/app/notificaciones");
    revalidatePath("/app");
    revalidatePath("/staff");
    revalidatePath("/admin");

    return successState(
      count > 0 ? `${count} notificación(es) marcadas como leídas.` : "No había avisos pendientes.",
    );
  } catch (error) {
    return toErrorState(error);
  }
}
