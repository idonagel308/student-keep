"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertOwnsSemester, requireUser } from "@/lib/dal";
import { parseSemesterDates } from "@/lib/semesterDates";
import type { ActionState } from "@/components/ActionForm";

export async function createSemester(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");

  if (!name || !startDateRaw || !endDateRaw) {
    return { error: "Name, start date and end date are required." };
  }

  let startDate: Date, endDate: Date;
  try {
    ({ startDate, endDate } = parseSemesterDates(startDateRaw, endDateRaw));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid date." };
  }

  await prisma.semester.create({
    data: {
      userId: user.id,
      name,
      startDate,
      endDate,
    },
  });

  revalidatePath("/");
  revalidatePath("/semesters");
}

export async function updateSemester(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startDateRaw = String(formData.get("startDate") ?? "");
  const endDateRaw = String(formData.get("endDate") ?? "");

  if (!id || !name || !startDateRaw || !endDateRaw) {
    return { error: "All fields are required." };
  }

  let startDate: Date, endDate: Date;
  try {
    ({ startDate, endDate } = parseSemesterDates(startDateRaw, endDateRaw));
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid date." };
  }

  await assertOwnsSemester(id);

  await prisma.semester.update({
    where: { id },
    data: {
      name,
      startDate,
      endDate,
    },
  });

  revalidatePath("/");
  revalidatePath("/semesters");
  revalidatePath(`/semesters/${id}`);
}

export async function deleteSemester(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing semester id.");

  await assertOwnsSemester(id);
  await prisma.semester.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/semesters");
  redirect("/");
}
