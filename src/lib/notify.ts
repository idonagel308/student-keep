import "server-only";

/**
 * Sends the site owner a Telegram message. Best-effort: a missing config or a
 * Telegram outage must never break the request that triggered it, because the
 * request is also listed on the admin page.
 */
export async function notifyOwner(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error(`[notify] telegram returned ${res.status}`);
  } catch {
    // Not logging the error: its message can contain the bot-token URL.
    console.error("[notify] telegram request failed");
  }
}
