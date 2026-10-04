"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { authorizedPersonSchema, fieldErrors } from "@/lib/validation/schemas";
import {
  createAuthorizedPerson,
  setAuthorizationActive,
  setPersonStatus,
} from "@/server/services/authorizations";

import { errorState, successState, toErrorState, type ActionState } from "./types";

/**
 * Gestión de personas autorizadas.
 *
 * Regla de permisos: la dirección puede administrar cualquier autorización; un
 * tutor solo puede administrar las de SUS hijos. La comprobación se hace contra
 * la base de datos, no contra lo que envíe el formulario.
 */
async function assertStudentsOwnedByTutor(
  studentIds: string[],
  tutorId: string,
): Promise<boolean> {
  const count = await prisma.student.count({
    where: { id: { in: studentIds }, tutorId, active: true },
  });
  return count === studentIds.length;
}

function revalidateAuthorizationViews() {
  revalidatePath("/admin/autorizados");
  revalidatePath("/admin/alumnos");
  revalidatePath("/staff/autorizaciones");
  revalidatePath("/app/autorizados");
  revalidatePath("/app/hijos");
}

export async function createAuthorizedPersonAction(
  _prev: ActionState<{ id: string; qrIdentifier: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string; qrIdentifier: string }>> {
  try {
    const user = await requireUser();

    const parsed = authorizedPersonSchema.safeParse({
      name: formData.get("name"),
      relationship: formData.get("relationship"),
      phone: formData.get("phone") ?? "",
      documentTail: formData.get("documentTail") ?? "",
      notes: formData.get("notes") ?? "",
      studentIds: formData.getAll("studentIds").map(String).filter(Boolean),
    });

    if (!parsed.success) {
      return errorState("Revisa los datos de la persona autorizada.", fieldErrors(parsed.error));
    }

    const isAdmin = can(user.role, "MANAGE_ALL_AUTHORIZATIONS");
    if (!isAdmin) {
      if (!can(user.role, "MANAGE_OWN_AUTHORIZATIONS")) {
        return errorState("No tienes permiso para registrar personas autorizadas.");
      }
      const owned = await assertStudentsOwnedByTutor(parsed.data.studentIds, user.id);
      if (!owned) {
        return errorState("Solo puedes autorizar personas para tus propios hijos.");
      }
    }

    const person = await createAuthorizedPerson(parsed.data, user);
    revalidateAuthorizationViews();

    return successState(
      `${person.name} quedó autorizada. Su código QR es ${person.qrIdentifier}.`,
      { id: person.id, qrIdentifier: person.qrIdentifier },
    );
  } catch (error) {
    return toErrorState(error);
  }
}

/** Activa o revoca una autorización concreta (persona ↔ alumno). */
export async function toggleAuthorizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();

    const authorizationId = String(formData.get("authorizationId") ?? "");
    const active = String(formData.get("active") ?? "") === "true";
    if (!authorizationId) return errorState("Falta la autorización a modificar.");

    const authorization = await prisma.studentAuthorizedPerson.findFirst({
      where: { id: authorizationId },
      include: { student: { select: { tutorId: true, schoolId: true } }, authorizedPerson: true },
    });
    if (!authorization || authorization.student.schoolId !== user.schoolId) {
      return errorState("La autorización indicada no está disponible.");
    }

    const isAdmin = can(user.role, "MANAGE_ALL_AUTHORIZATIONS");
    if (!isAdmin && authorization.student.tutorId !== user.id) {
      return errorState("Solo puedes modificar las autorizaciones de tus propios hijos.");
    }

    // Un tutor no puede revocar su propia autorización: perdería el acceso a
    // la recogida de su hijo desde el propio sistema.
    if (authorization.authorizedPerson.userId === user.id && !active) {
      return errorState("No puedes revocar tu propia autorización como tutor.");
    }

    const result = await setAuthorizationActive(authorizationId, active, user);
    revalidateAuthorizationViews();

    return successState(
      active
        ? `${result.personName} ya puede recoger a ${result.studentName}.`
        : `Se revocó la autorización de ${result.personName} sobre ${result.studentName}.`,
    );
  } catch (error) {
    return toErrorState(error);
  }
}

/** Suspende o reactiva a una persona en todo el centro (solo dirección). */
export async function setPersonStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!can(user.role, "MANAGE_ALL_AUTHORIZATIONS")) {
      return errorState("Solo la dirección puede suspender a una persona autorizada.");
    }

    const personId = String(formData.get("personId") ?? "");
    const status = String(formData.get("status") ?? "") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
    if (!personId) return errorState("Falta la persona a modificar.");

    const result = await setPersonStatus(personId, status, user);
    revalidateAuthorizationViews();
    revalidatePath(`/admin/autorizados/${personId}`);

    return successState(
      status === "SUSPENDED"
        ? `${result.name} quedó suspendida: no podrá recoger a ningún alumno.`
        : `${result.name} quedó reactivada.`,
    );
  } catch (error) {
    return toErrorState(error);
  }
}
