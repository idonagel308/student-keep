import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

/** Short-lived cookie carrying the CSRF state value between /connect and /callback. */
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

// calendar.events (not the broader "calendar" scope, which also grants
// calendar *settings* access nothing here needs) + tasks (full read/write —
// tasks.readonly isn't enough since this creates/updates/deletes).
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/** Builds Google's OAuth authorization URL for the "connect" redirect. */
export function getConnectUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    scope: SCOPES,
    // Without this, Google never issues a refresh token — only a
    // short-lived access token.
    access_type: "offline",
    // Google only returns a refresh token on the *first* consent grant
    // unless the consent screen is forced again; without this,
    // reconnecting after a disconnect silently fails to produce a new one.
    prompt: "consent",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google token request failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens(code: string) {
  return postToken(
    new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    })
  );
}

export async function refreshAccessToken(refreshToken: string) {
  return postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    })
  );
}

/** True once an access token's cached expiry is close enough to worry about. */
export function isTokenExpired(expiry: Date | null, now: Date = new Date()): boolean {
  if (!expiry) return true;
  // 60s buffer so a token that's valid-but-about-to-expire mid-request
  // doesn't get used and rejected by Google.
  return expiry.getTime() - now.getTime() < 60_000;
}

type GoogleUser = {
  id: string;
  googleRefreshToken: string | null;
  googleAccessToken: string | null;
  googleAccessTokenExpiry: Date | null;
};

/**
 * The function every sync call goes through. Returns a valid access token,
 * refreshing and persisting a new one first if the cached one is missing or
 * expired. Returns null if the user isn't connected at all.
 */
export async function getValidAccessToken(user: GoogleUser): Promise<string | null> {
  if (!user.googleRefreshToken) return null;

  if (user.googleAccessToken && !isTokenExpired(user.googleAccessTokenExpiry)) {
    return user.googleAccessToken;
  }

  const { access_token, expires_in } = await refreshAccessToken(user.googleRefreshToken);
  const expiry = new Date(Date.now() + expires_in * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { googleAccessToken: access_token, googleAccessTokenExpiry: expiry },
  });

  return access_token;
}
