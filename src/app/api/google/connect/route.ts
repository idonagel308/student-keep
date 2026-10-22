import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import { getConnectUrl, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/auth";
import { isEncryptionConfigured } from "@/lib/google/tokenCrypto";

export async function GET() {
  await requireUser();

  // The callback refuses to store tokens without an encryption key, so fail
  // here instead of sending the user through Google's consent screen first.
  if (!isEncryptionConfigured()) redirect("/?error=google");

  const state = randomBytes(24).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  redirect(getConnectUrl(state));
}
