"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertOwnsCourse, assertOwnsSemester } from "@/lib/dal";
import type { ActionState } from "@/components/ActionForm";

// A real course won't have more lectures than this; the cap exists so a
// bogus value can't allocate an unbounded array (Array.from({length: n}))
// or write an unbounded number of rows in one request.
const MAX_LECTURES = 500;

function parseCredits(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Credits must be a non-negative number.");
  }
  return n;
}

export async function createCourse(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const semesterId = String(formData.get("semesterId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const totalLectures = Number(formData.get("totalLectures") ?? 0);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;

  if (!semesterId || !name) {
    return { error: "Course name is required." };
  }
  if (!Number.isFinite(totalLectures) || totalLectures < 0 || totalLectures > MAX_LECTURES) {
    return { error: `Total lectures must be between 0 and ${MAX_LECTURES}.` };
  }

  let credits: number | null;
  try {
    credits = parseCredits(creditsRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid credits." };
  }

  await assertOwnsSemester(semesterId);

  await prisma.course.create({
    data: {
      semesterId,
      name,
      totalLectures: Math.floor(totalLectures),
      credits,
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
}

export async function updateCourse(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  const semesterId = String(formData.get("semesterId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const totalLectures = Number(formData.get("totalLectures") ?? 0);
  const creditsRaw = String(formData.get("credits") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || null;

  if (!id || !name) return { error: "Course name is required." };
  if (!Number.isFinite(totalLectures) || totalLectures < 0 || totalLectures > MAX_LECTURES) {
    return { error: `Total lectures must be between 0 and ${MAX_LECTURES}.` };
  }

  let credits: number | null;
  try {
    credits = parseCredits(creditsRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid credits." };
  }

  await assertOwnsCourse(id);

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
      credits,
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

  await assertOwnsCourse(id);
  await prisma.course.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath(`/semesters/${semesterId}`);
  redirect(`/semesters/${semesterId}`);
}
