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
    <form action={formAction} className="space-y-4">
      {isSignup && (
        <div>
          <label className={labelClass} htmlFor="name">
            Name (optional)
          </label>
          <input id="name" name="name" className={inputClass} />
        </div>
      )}

      <div>
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

      <div>
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
          <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
        )}
      </div>

      {isSignup && (
        <div>
          <label className={labelClass} htmlFor="inviteCode">
            Invite code
          </label>
          <input
            id="inviteCode"
            name="inviteCode"
            required
            className={inputClass}
          />
        </div>
      )}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
        {pending
          ? isSignup
            ? "Creating account…"
            : "Signing in…"
          : isSignup
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Have an invite code?{" "}
            <Link href="/signup" className="text-indigo-600 hover:underline dark:text-indigo-400">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
