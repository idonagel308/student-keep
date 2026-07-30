"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inputClass, labelClass, btnPrimary } from "@/components/ui";
import type { AuthState } from "@/app/actions/auth";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

export function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          className={inputClass}
        />
        {isSignup && (
          <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-neutral-600)" }}>
            At least 8 characters.
          </p>
        )}
      </div>

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

      <button type="submit" disabled={pending} className={`${btnPrimary} btn-block`}>
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
