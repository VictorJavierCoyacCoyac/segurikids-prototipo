"use server";

import { revalidatePath } from "next/cache";

import { assertCan } from "@/lib/auth/permissions";
import { requireRole } from "@/lib/auth/session";
import { fieldErrors, studentSchema } from "@/lib/validation/schemas";
import { createStudent, updateStudent } from "@/server/services/students";

import { errorState, successState, toErrorState, type ActionState } from "./types";

function readStudentForm(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    group: formData.get("group"),
    tutorId: formData.get("tutorId"),
    status: formData.get("status") ?? "ABSENT",
    birthDate: formData.get("birthDate") ?? "",
    bloodType: formData.get("bloodType") ?? "",
    allergies: formData.get("allergies") ?? "",
    notes: formData.get("notes") ?? "",
  };
}

export async function createStudentAction(
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN");
    assertCan(user.role, "MANAGE_STUDENTS");

    const parsed = studentSchema.safeParse(readStudentForm(formData));
    if (!parsed.success) {
      return errorState("Revisa los datos del alumno.", fieldErrors(parsed.error));
    }

    const student = await createStudent(parsed.data, user);

    revalidatePath("/admin/alumnos");
    revalidatePath("/admin");
    revalidatePath("/staff/alumnos");

    return successState(
      `${student.firstName} ${student.lastName} se registró correctamente.`,
      { id: student.id },
    );
  } catch (error) {
    return toErrorState(error);
  }
}

export async function updateStudentAction(
  _prev: ActionState<{ id: string }>,
  formData: FormData,
): Promise<ActionState<{ id: string }>> {
  try {
    const user = await requireRole("ADMIN");
    assertCan(user.role, "MANAGE_STUDENTS");

    const studentId = String(formData.get("studentId") ?? "");
    if (!studentId) return errorState("Falta el identificador del alumno.");

    const parsed = studentSchema.safeParse(readStudentForm(formData));
    if (!parsed.success) {
      return errorState("Revisa los datos del alumno.", fieldErrors(parsed.error));
    }

    const student = await updateStudent(studentId, parsed.data, user);

    revalidatePath("/admin/alumnos");
    revalidatePath(`/admin/alumnos/${studentId}`);
    revalidatePath("/admin");
    revalidatePath("/staff/alumnos");

    return successState("Los datos del alumno se actualizaron.", { id: student.id });
  } catch (error) {
    return toErrorState(error);
  }
}
