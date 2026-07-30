"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { ActionForm } from "@/components/ActionForm";
import { logout } from "@/app/actions/auth";
import { setLanguage, setDegreeSettings } from "@/app/actions/settings";
import { inputClass, labelClass, btnPrimary } from "@/components/ui";
import { GearIcon, LogoutIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

const THEME_STORAGE_KEY = "theme";

function currentTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function segStyle(active: boolean): string {
  return active ? "btn btn-primary" : "btn btn-secondary";
}

export function Settings({
  lang,
  user,
  degreeName,
  creditsRequired,
}: {
  lang: Lang;
  user: { name: string | null; email: string };
  degreeName: string | null;
  creditsRequired: number | null;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(currentTheme());
  }, []);

  function applyTheme(next: "light" | "dark") {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  }

  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <Modal
      title={t(lang, "settings")}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="btn btn-icon btn-ghost"
          aria-label={t(lang, "settings")}
        >
          <GearIcon />
        </button>
      )}
    >
      {() => (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {/* Appearance */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: 10,
              }}
            >
              {t(lang, "appearance")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className={segStyle(theme === "light")} onClick={() => applyTheme("light")}>
                {t(lang, "day")}
              </button>
              <button type="button" className={segStyle(theme === "dark")} onClick={() => applyTheme("dark")}>
                {t(lang, "night")}
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: 10,
              }}
            >
              {t(lang, "language")}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <form action={setLanguage}>
                <input type="hidden" name="lang" value="en" />
                <button type="submit" className={segStyle(lang === "en")}>
                  {t(lang, "english")}
                </button>
              </form>
              <form action={setLanguage}>
                <input type="hidden" name="lang" value="he" />
                <button type="submit" className={segStyle(lang === "he")}>
                  {t(lang, "hebrew")}
                </button>
              </form>
            </div>
            <p style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", margin: "10px 0 0", lineHeight: 1.5 }}>
              {t(lang, "languageNote")}
            </p>
          </div>

          {/* Degree */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: 10,
              }}
            >
              {t(lang, "degreeSettingsLabel")}
            </div>
            <ActionForm action={setDegreeSettings} resetOnSuccess={false}>
              {(pending) => (
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  <div className="field">
                    <label className={labelClass}>{t(lang, "degreeNameLabel")}</label>
                    <input
                      name="degreeName"
                      defaultValue={degreeName ?? ""}
                      placeholder={t(lang, "degreeNamePlaceholder")}
                      className={inputClass}
                    />
                  </div>
                  <div className="field">
                    <label className={labelClass}>{t(lang, "creditsRequiredLabel")}</label>
                    <input
                      type="number"
                      name="creditsRequired"
                      min={0}
                      defaultValue={creditsRequired ?? ""}
                      className={inputClass}
                    />
                  </div>
                  <button type="submit" disabled={pending} className={`${btnPrimary} btn-block`} style={{ marginTop: 0 }}>
                    {pending ? t(lang, "saving") : t(lang, "save")}
                  </button>
                </div>
              )}
            </ActionForm>
            <p style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", margin: "10px 0 0", lineHeight: 1.5 }}>
              {t(lang, "degreeSettingsNote")}
            </p>
          </div>

          {/* Account */}
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: 10,
              }}
            >
              {t(lang, "account")}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  color: "var(--color-bg)",
                  fontWeight: 600,
                  fontSize: 14,
                  flex: "none",
                }}
              >
                {initial}
              </div>
              <div>
                <div style={{ fontSize: "14.5px" }}>{user.name ?? user.email}</div>
                <div style={{ fontSize: "11.5px", color: "var(--color-neutral-500)" }}>
                  {t(lang, "signedInAs")}
                </div>
              </div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="btn btn-secondary btn-block"
                style={{ marginTop: 16, gap: 7, color: "var(--color-accent-2)" }}
              >
                <LogoutIcon />
                {t(lang, "logOut")}
              </button>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
}
