"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";

/**
 * Marks the first-run walkthrough as dismissed, whether the user finished it
 * or skipped it — either way it should never appear again.
 */
export async function completeOnboarding() {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { hasCompletedOnboarding: true },
  });

  revalidatePath("/", "layout");
}
