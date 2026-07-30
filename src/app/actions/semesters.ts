"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertOwnsSemester, requireUser } from "@/lib/dal";
import type { ActionState } from "@/components/ActionForm";

function parseDate(raw: string, label: string): Date {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${label} is not a valid date.`);
  }
  return d;
}

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
    startDate = parseDate(startDateRaw, "Start date");
    endDate = parseDate(endDateRaw, "End date");
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
    startDate = parseDate(startDateRaw, "Start date");
    endDate = parseDate(endDateRaw, "End date");
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
  revalidatePath(`/semesters/${id}`);
}

export async function deleteSemester(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing semester id.");

  await assertOwnsSemester(id);
  await prisma.semester.delete({ where: { id } });

  revalidatePath("/");
  redirect("/");
}
