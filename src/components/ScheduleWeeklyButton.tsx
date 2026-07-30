"use client";

import { useState } from "react";
import { scheduleLecturesWeekly } from "@/app/actions/lectures";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

export function ScheduleWeeklyButton({ courseId, lang }: { courseId: string; lang: Lang }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost"
        style={{ gap: 7 }}
        title={t(lang, "scheduleWeeklyHint")}
      >
        {t(lang, "scheduleWeekly")}
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
        {t(lang, "apply")}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="btn btn-ghost"
        style={{ fontSize: 12 }}
      >
        {t(lang, "cancel")}
      </button>
    </form>
  );
}
