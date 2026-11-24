"use client";

import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";
import { inputClass, labelClass, btnPrimary } from "@/components/ui";
import { rescheduleMissedLecture, dismissMissedLecture } from "@/app/actions/lectures";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

/** Shown on the course page while a cancelled class still needs a make-up date. */
export function MissedLectures({ courseId, count, lang }: { courseId: string; count: number; lang: Lang }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-accent-2)",
        borderRadius: "var(--radius-md)",
        padding: 14,
        marginBottom: 18,
      }}
    >
      <strong style={{ fontSize: 14 }}>{t(lang, "missedClasses", count)}</strong>
      <p style={{ margin: "4px 0 12px", fontSize: 12.5, color: "var(--color-neutral-600)" }}>
        {t(lang, "missedClassesHint")}
      </p>
      <ActionForm action={rescheduleMissedLecture}>
        {(pending) => (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10 }}>
            <input type="hidden" name="courseId" value={courseId} />
            <div>
              <label className={labelClass} htmlFor="makeupDate">
                {t(lang, "makeupDateLabel")}
              </label>
              <input id="makeupDate" type="date" name="date" required className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="makeupStart">
                {t(lang, "startTimeLabel")}
              </label>
              <input id="makeupStart" type="time" name="startTime" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="makeupEnd">
                {t(lang, "endTimeLabel")}
              </label>
              <input id="makeupEnd" type="time" name="endTime" className={inputClass} />
            </div>
            <button type="submit" disabled={pending} className={btnPrimary}>
              {pending ? t(lang, "saving") : t(lang, "scheduleMakeup")}
            </button>
          </div>
        )}
      </ActionForm>
      <div style={{ marginTop: 8 }}>
        <DeleteButton
          action={dismissMissedLecture}
          hidden={{ courseId }}
          label={t(lang, "noMakeup")}
          confirmMessage={t(lang, "noMakeupConfirm")}
          className="btn btn-ghost"
        />
      </div>
    </div>
  );
}
