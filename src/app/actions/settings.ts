"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import type { ActionState } from "@/components/ActionForm";

export async function setLanguage(formData: FormData) {
  const lang = String(formData.get("lang") ?? "en") === "he" ? "he" : "en";

  const store = await cookies();
  store.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Language affects every server-rendered page's text, so the whole
  // layout tree needs to be considered stale, not just the current route.
  revalidatePath("/", "layout");
}

function parseCreditsRequired(raw: string): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Credits required must be a non-negative number.");
  }
  return n;
}

export async function setDegreeSettings(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const degreeName = String(formData.get("degreeName") ?? "").trim() || null;
  const creditsRequiredRaw = String(formData.get("creditsRequired") ?? "").trim();

  let creditsRequired: number | null;
  try {
    creditsRequired = parseCreditsRequired(creditsRequiredRaw);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid input." };
  }

  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { degreeName, creditsRequired },
  });

  revalidatePath("/degree");
  revalidatePath("/");
}
