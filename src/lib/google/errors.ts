/**
 * Turns the raw error thrown by a Google call (status code plus the JSON body
 * Google sent back) into one sentence a person can act on. Sync failures are
 * otherwise invisible, which made "nothing happens" impossible to diagnose.
 */
export function describeGoogleError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const lower = text.toLowerCase();
  const status = /\((\d{3})\)/.exec(text)?.[1];

  if (lower.includes("invalid_grant")) {
    return "Google rejected the saved connection (it expired or was revoked). Disconnect and connect again.";
  }
  if (lower.includes("unable to authenticate data") || lower.includes("encryption key")) {
    return "The saved Google connection can't be read, probably because the encryption key changed. Disconnect and connect again.";
  }
  if (
    lower.includes("has not been used in project") ||
    lower.includes("service_disabled") ||
    lower.includes("accessnotconfigured")
  ) {
    return "The Google Calendar API or Google Tasks API isn't enabled in this app's Google Cloud project. Enable both in Google Cloud Console, then press Save again.";
  }
  if (lower.includes("insufficient") || lower.includes("scope")) {
    return "Google didn't grant calendar/tasks access. Disconnect, connect again, and tick every permission box on Google's screen.";
  }
  if (status === "401") {
    return "Google rejected the sign-in. Disconnect and connect again.";
  }
  if (status === "403") {
    return "Google refused the request (403). Check that you're on the app's test-user list and that both APIs are enabled.";
  }
  if (status === "429") {
    return "Google is rate-limiting requests. Wait a minute and press Save again.";
  }
  return `Google sync failed: ${text.slice(0, 160)}`;
}
