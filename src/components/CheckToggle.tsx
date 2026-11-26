"use client";

import { useOptimistic } from "react";
import { CheckIcon } from "@/components/icons";

/**
 * The watched/done checkbox. Flips the moment it's tapped and saves in the
 * background; the server's value takes over when the save finishes (or
 * reverts it if the save fails).
 */
export function CheckToggle({
  action,
  id,
  courseId,
  checked,
  labelWhenChecked,
  labelWhenUnchecked,
  style,
}: {
  action: (formData: FormData) => Promise<unknown>;
  id: string;
  courseId: string;
  checked: boolean;
  /** aria-labels for each state (plain strings so server components can pass them). */
  labelWhenChecked: string;
  labelWhenUnchecked: string;
  style?: React.CSSProperties;
}) {
  const [shown, setShown] = useOptimistic(checked);

  return (
    <form
      action={async (formData) => {
        setShown(!shown);
        await action(formData);
      }}
      style={style}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="courseId" value={courseId} />
      <button type="submit" className="check-box" aria-pressed={shown} aria-label={shown ? labelWhenChecked : labelWhenUnchecked}>
        <CheckIcon checked={shown} />
      </button>
    </form>
  );
}
