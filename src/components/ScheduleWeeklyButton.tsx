"use client";

import { useState } from "react";
import { scheduleLecturesWeekly } from "@/app/actions/lectures";

export function ScheduleWeeklyButton({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost"
        style={{ gap: 7 }}
        title="One lecture a week, starting from a date you pick"
      >
        Schedule weekly
      </button>
    );
  }

  return (
    <form
      action={scheduleLecturesWeekly as (fd: FormData) => void}
      style={{ display: "flex", alignItems: "center", gap: 8 }}
    >
      <input type="hidden" name="courseId" value={courseId} />
      <input type="date" name="startDate" required className="input" style={{ minHeight: 32, fontSize: 13 }} />
      <button type="submit" className="btn btn-primary" style={{ fontSize: 12 }}>
        Apply
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="btn btn-ghost"
        style={{ fontSize: 12 }}
      >
        Cancel
      </button>
    </form>
  );
}
