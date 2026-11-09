"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary } from "@/components/ui";
import { requestAccess } from "@/app/actions/signupRequests";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

export function RequestAccessForm({ lang }: { lang: Lang }) {
  return (
    <ActionForm action={requestAccess}>
      {(pending) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="field">
            <label className={labelClass} htmlFor="email">
              {t(lang, "emailLabel")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              className={inputClass}
            />
          </div>
          <button type="submit" disabled={pending} className={`${btnPrimary} btn-block`}>
            {pending ? t(lang, "sendingRequest") : t(lang, "sendRequest")}
          </button>
          <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-neutral-600)", margin: 0 }}>
            {t(lang, "backToSignup")} <Link href="/signup">{t(lang, "createAccount")}</Link>
          </p>
        </div>
      )}
    </ActionForm>
  );
}
