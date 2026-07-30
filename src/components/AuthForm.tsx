"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { inputClass, labelClass, btnPrimary } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  lang: Lang;
};

function PasswordToggle({
  shown,
  onClick,
  lang,
}: {
  shown: boolean;
  onClick: () => void;
  lang: Lang;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? t(lang, "hidePassword") : t(lang, "showPassword")}
      style={{
        position: "absolute",
        insetInlineEnd: 4,
        top: "50%",
        transform: "translateY(-50%)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28,
        height: 28,
        padding: 0,
        border: 0,
        background: "transparent",
        color: "var(--color-neutral-600)",
        cursor: "pointer",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  );
}

export function AuthForm({ mode, action, lang }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const mismatch = isSignup && confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (mismatch) e.preventDefault();
      }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      {isSignup && (
        <div className="field">
          <label className={labelClass} htmlFor="name">
            {t(lang, "nameLabel")}
          </label>
          <input id="name" name="name" className={inputClass} />
        </div>
      )}

      <div className="field">
        <label className={labelClass} htmlFor="email">
          {t(lang, "emailLabel")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </div>

      <div className="field">
        <label className={labelClass} htmlFor="password">
          {t(lang, "passwordLabel")}
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={isSignup ? 8 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            style={{ paddingInlineEnd: 36 }}
          />
          <PasswordToggle shown={showPassword} onClick={() => setShowPassword((v) => !v)} lang={lang} />
        </div>
        {isSignup && (
          <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-neutral-600)" }}>
            {t(lang, "minPasswordNote")}
          </p>
        )}
      </div>

      {isSignup && (
        <div className="field">
          <label className={labelClass} htmlFor="confirmPassword">
            {t(lang, "confirmPasswordLabel")}
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              style={{ paddingInlineEnd: 36 }}
            />
            <PasswordToggle shown={showConfirm} onClick={() => setShowConfirm((v) => !v)} lang={lang} />
          </div>
          {mismatch && (
            <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-accent-2)" }}>
              {t(lang, "passwordMismatch")}
            </p>
          )}
        </div>
      )}

      {isSignup && (
        <div className="field">
          <label className={labelClass} htmlFor="inviteCode">
            {t(lang, "inviteCodeLabel")}
          </label>
          <input id="inviteCode" name="inviteCode" required className={inputClass} />
        </div>
      )}

      {state?.error && (
        <div style={{ fontSize: "12.5px", color: "var(--color-accent-2)" }}>
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || mismatch}
        className={`${btnPrimary} btn-block`}
      >
        {pending
          ? isSignup
            ? t(lang, "creatingAccount")
            : t(lang, "signingIn")
          : isSignup
            ? t(lang, "createAccount")
            : t(lang, "signIn")}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-neutral-600)", margin: 0 }}>
        {isSignup ? (
          <>
            {t(lang, "alreadyHaveAccount")} <Link href="/login">{t(lang, "signIn")}</Link>
          </>
        ) : (
          <>
            {t(lang, "haveInvite")} <Link href="/signup">{t(lang, "createAccount")}</Link>
          </>
        )}
      </p>
    </form>
  );
}
