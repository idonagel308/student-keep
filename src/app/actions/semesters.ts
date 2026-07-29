"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertOwnsSemester, requireUser } from "@/lib/dal";

export async function createSemester(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!name || !startDate || !endDate) {
    throw new Error("Name, start date and end date are required.");
  }

  await prisma.semester.create({
    data: {
      userId: user.id,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
  });

  revalidatePath("/");
}

export async function updateSemester(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");

  if (!id || !name || !startDate || !endDate) {
    throw new Error("All fields are required.");
  }

  await assertOwnsSemester(id);

  await prisma.semester.update({
    where: { id },
    data: {
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
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
