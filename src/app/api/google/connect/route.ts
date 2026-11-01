import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/dal";
import {
  getConnectUrl,
  getGoogleSetupProblem,
  GOOGLE_OAUTH_STATE_COOKIE,
} from "@/lib/google/auth";

export async function GET() {
  await requireUser();

  // Fail here, with a message the home page can show, instead of sending the
  // user through Google's consent screen only to be refused afterwards (or
  // crashing on a missing client id). The callback refuses to store tokens
  // without an encryption key, so that one is checked too.
  const missing = getGoogleSetupProblem();
  if (missing) {
    console.error(`[google] cannot connect: ${missing} is not set.`);
    redirect("/?error=google-config");
  }

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
