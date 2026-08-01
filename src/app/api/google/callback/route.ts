import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/dal";
import { exchangeCodeForTokens, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google/auth";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  // Single-use regardless of outcome.
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    redirect("/?error=google");
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.refresh_token) {
    // Shouldn't happen with prompt=consent, but without a refresh token
    // there's nothing usable to store.
    redirect("/?error=google");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      googleRefreshToken: tokens.refresh_token,
      googleAccessToken: tokens.access_token,
      googleAccessTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  redirect("/?google=connected");
}
