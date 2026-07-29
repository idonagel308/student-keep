"use client";

import { useState, useTransition } from "react";

type Props = {
  action: (formData: FormData) => Promise<unknown>;
  onSuccess?: () => void;
  className?: string;
  children: (pending: boolean) => React.ReactNode;
  resetOnSuccess?: boolean;
};

export function ActionForm({
  action,
  onSuccess,
  className,
  children,
  resetOnSuccess = true,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        startTransition(async () => {
          try {
            await action(fd);
            setError(null);
            if (resetOnSuccess) form.reset();
            onSuccess?.();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Something went wrong."
            );
          }
        });
      }}
    >
      {children(pending)}
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
