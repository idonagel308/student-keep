import Link from "next/link";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

/**
 * The Google connect flow ends with a redirect to "/?google=connected" or
 * "/?error=<code>". Without this, a failed connect looked like nothing
 * happened. Unknown codes render nothing.
 */
export function GoogleNotice({
  google,
  error,
  lang,
}: {
  google?: string;
  error?: string;
  lang: Lang;
}) {
  let kind: "ok" | "error" | null = null;
  let message = "";

  if (google === "connected") {
    kind = "ok";
    message = t(lang, "googleConnectedNotice");
  } else if (error === "google-config") {
    kind = "error";
    message = t(lang, "googleConfigNotice");
  } else if (error === "google") {
    kind = "error";
    message = t(lang, "googleErrorNotice");
  }

  if (!kind) return null;

  const color = kind === "ok" ? "var(--color-accent)" : "var(--color-accent-2)";
  return (
    <div
      role={kind === "ok" ? "status" : "alert"}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 12,
        maxWidth: 660,
        marginBottom: 24,
        padding: "10px 14px",
        borderRadius: "var(--radius-md)",
        background: "var(--color-surface)",
        borderInlineStart: `3px solid ${color}`,
        fontSize: 14,
        lineHeight: 1.5,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <Link href="/" style={{ flex: "none", fontSize: 12.5, color: "var(--color-neutral-600)" }}>
        {t(lang, "dismiss")}
      </Link>
    </div>
  );
}
