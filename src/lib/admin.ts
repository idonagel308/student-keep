import "server-only";

import { notFound } from "next/navigation";
import { requireUser } from "@/lib/dal";

/** The signed-in owner (ADMIN_EMAIL), or a 404 for anyone else. */
export async function requireAdmin() {
  const user = await requireUser();
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin || user.email.toLowerCase() !== admin) notFound();
  return user;
}
