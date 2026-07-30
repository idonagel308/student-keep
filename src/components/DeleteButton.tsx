"use client";

import { btnDanger } from "./ui";

export function DeleteButton({
  action,
  hidden,
  label = "Delete",
  ariaLabel,
  confirmMessage = "Are you sure? This cannot be undone.",
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  hidden: Record<string, string>;
  label?: React.ReactNode;
  ariaLabel?: string;
  confirmMessage?: string;
  className?: string;
}) {
  return (
    <form
      action={action as (formData: FormData) => void}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className ?? btnDanger} aria-label={ariaLabel}>
        {label}
      </button>
    </form>
  );
}
