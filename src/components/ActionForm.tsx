"use client";

import { useActionState, useEffect, useRef } from "react";

export type ActionState = { error: string } | undefined;

type Props = {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onSuccess?: () => void;
  className?: string;
  children: (pending: boolean) => React.ReactNode;
  resetOnSuccess?: boolean;
};

/**
 * Wraps useActionState so callers get pending state, error display, and an
 * onSuccess callback without repeating the wiring. Actions passed in must
 * return `{ error }` for expected failures rather than throwing — thrown
 * Error messages are redacted by Next.js in production when they cross the
 * server/client boundary (confirmed empirically against a production
 * build), so returning a value is the only way validation messages like
 * "Course name is required" survive to the user once deployed.
 */
export function ActionForm({
  action,
  onSuccess,
  className,
  children,
  resetOnSuccess = true,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    const justFinished = wasPending.current && !pending;
    if (justFinished && !state?.error) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.();
    }
    wasPending.current = pending;
  }, [pending, state, onSuccess, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} className={className}>
      {children(pending)}
      {state?.error && (
        <p className="mt-2 text-sm" style={{ color: "var(--color-accent-2)" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
