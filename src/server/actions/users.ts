"use server";

import { revalidatePath } from "next/cache";

import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { fieldErrors, userSchema } from "@/lib/validation/schemas";
import { createUser, emailExists } from "@/server/services/users";

import { errorState, successState, toErrorState, type ActionState } from "./types";

/**
 * Alta de cuentas de usuario.
 *
 * Reservado a dirección: se comprueba el permiso en el servidor, no solo
 * ocultando el botón. Un prototipo de seguridad escolar no puede permitir que
 * cualquiera cree cuentas, porque de ellas depende quién recoge a un menor.
 */
export type CreatedUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  qrIdentifier: string | null;
};

export async function createUserAction(
  _prev: ActionState<CreatedUser>,
  formData: FormData,
): Promise<ActionState<CreatedUser>> {
  try {
    const actor = await requireUser();
    if (!can(actor.role, "MANAGE_USERS")) {
      return errorState("Solo la dirección del centro puede dar de alta usuarios.");
    }

    const parsed = userSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role: formData.get("role"),
      phone: formData.get("phone") ?? "",
      jobTitle: formData.get("jobTitle") ?? "",
      relationship: (formData.get("relationship") as string) || undefined,
    });

    if (!parsed.success) {
      return errorState("Revisa los datos de la cuenta.", fieldErrors(parsed.error));
    }

    // Se comprueba antes para devolver el mensaje junto al campo correcto,
    // en lugar de dejar que falle la restricción de unicidad de la base de datos.
    if (await emailExists(parsed.data.email)) {
      return errorState("Ese correo ya está registrado.", {
        email: "Ya existe una cuenta con este correo electrónico.",
      });
    }

    const { user, qrIdentifier } = await createUser(parsed.data, actor);

    revalidatePath("/admin/personal");
    revalidatePath("/admin/tutores");
    revalidatePath("/admin/alumnos");
    revalidatePath("/admin/autorizados");
    revalidatePath("/admin");

    return successState(
      qrIdentifier
        ? `${user.name} ya puede acceder. Su credencial de recogida es ${qrIdentifier}.`
        : `${user.name} ya puede acceder con su correo y contraseña.`,
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        qrIdentifier,
      },
    );
  } catch (error) {
    return toErrorState(error);
  }
}
