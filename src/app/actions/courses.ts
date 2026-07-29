"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function createCourse(formData: FormData) {
  const semesterId = String(formData.get("semesterId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const totalLectures = Number(formData.get("totalLectures") ?? 0);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;

  if (!semesterId || !name) {
    throw new Error("Course name is required.");
  }
  if (!Number.isFinite(totalLectures) || totalLectures < 0) {
    throw new Error("Total lectures must be a non-negative number.");
  }

  const course = await prisma.course.create({
    data: {
      semesterId,
      name,
      totalLectures: Math.floor(totalLectures),
      credits: creditsRaw ? Number(creditsRaw) : null,
      color,
      lectures: {
        create: Array.from({ length: Math.floor(totalLectures) }, (_, i) => ({
          number: i + 1,
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath(`/semesters/${semesterId}`);
  return course.id;
}

export async function updateCourse(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const semesterId = String(formData.get("semesterId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const totalLectures = Number(formData.get("totalLectures") ?? 0);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;

  if (!id || !name) throw new Error("Course name is required.");
  if (!Number.isFinite(totalLectures) || totalLectures < 0) {
    throw new Error("Total lectures must be a non-negative number.");
  }

  const target = Math.floor(totalLectures);

  const existing = await prisma.lecture.findMany({
    where: { courseId: id },
    orderBy: { number: "asc" },
  });
  const currentCount = existing.length;

  if (target > currentCount) {
    await prisma.lecture.createMany({
      data: Array.from({ length: target - currentCount }, (_, i) => ({
        courseId: id,
        number: currentCount + i + 1,
      })),
    });
  } else if (target < currentCount) {
    // Remove the highest-numbered lectures beyond the new total.
    const toRemove = existing.slice(target).map((l) => l.id);
    await prisma.lecture.deleteMany({ where: { id: { in: toRemove } } });
  }

  await prisma.course.update({
    where: { id },
    data: {
      name,
      totalLectures: target,
      credits: creditsRaw ? Number(creditsRaw) : null,
      color,
    },
  });

  revalidatePath("/");
  revalidatePath(`/semesters/${semesterId}`);
  revalidatePath(`/courses/${id}`);
}

export async function deleteCourse(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const semesterId = String(formData.get("semesterId") ?? "");
  if (!id) throw new Error("Missing course id.");

  await prisma.course.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath(`/semesters/${semesterId}`);
  redirect(`/semesters/${semesterId}`);
}
