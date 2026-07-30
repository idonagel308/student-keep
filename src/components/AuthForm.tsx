"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { inputClass, labelClass, btnPrimary } from "@/components/ui";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

function PasswordToggle({
  shown,
  onClick,
}: {
  shown: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? "Hide password" : "Show password"}
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

export function AuthForm({ mode, action }: Props) {
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
            Name (optional)
          </label>
          <input id="name" name="name" className={inputClass} />
        </div>
      )}

      <div className="field">
        <label className={labelClass} htmlFor="email">
          Email
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
          Password
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
          <PasswordToggle shown={showPassword} onClick={() => setShowPassword((v) => !v)} />
        </div>
        {isSignup && (
          <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-neutral-600)" }}>
            At least 8 characters.
          </p>
        )}
      </div>

      {isSignup && (
        <div className="field">
          <label className={labelClass} htmlFor="confirmPassword">
            Confirm password
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
            <PasswordToggle shown={showConfirm} onClick={() => setShowConfirm((v) => !v)} />
          </div>
          {mismatch && (
            <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-accent-2)" }}>
              Passwords do not match.
            </p>
          )}
        </div>
      )}

      {isSignup && (
        <div className="field">
          <label className={labelClass} htmlFor="inviteCode">
            Invite code
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
            ? "Creating account…"
            : "Signing in…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: "var(--color-neutral-600)", margin: 0 }}>
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Sign in</Link>
          </>
        ) : (
          <>
            Have an invite code? <Link href="/signup">Create an account</Link>
          </>
        )}
      </p>
    </form>
  );
}
