"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";
import { EditIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

type LectureValues = {
  id: string;
  number: number;
  title: string | null;
  scheduledDate: string;
  /** The lecture's own override only - empty means "use the course time". */
  startTime: string | null;
  endTime: string | null;
};

export function LectureForm({
  action,
  initial,
  courseTimeLabel,
  lang,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initial: LectureValues;
  /** The course's formatted time, shown so it's clear what "empty" falls back to. */
  courseTimeLabel: string;
  lang: Lang;
}) {
  return (
    <Modal
      closeLabel={t(lang, "close")}
      title={t(lang, "editLecture", initial.number)}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="btn btn-icon btn-ghost"
          aria-label={t(lang, "editLecture", initial.number)}
        >
          <EditIcon />
        </button>
      )}
    >
      {(close) => (
        <ActionForm action={action} onSuccess={close}>
          {(pending) => (
            <div className="space-y-4">
              <input type="hidden" name="id" value={initial.id} />
              <div className="field">
                <label className={labelClass}>{t(lang, "lectureTitleLabel")}</label>
                <input
                  name="title"
                  defaultValue={initial.title ?? ""}
                  placeholder="e.g. Uniform continuity"
                  className={inputClass}
                />
              </div>
              <div className="field">
                <label className={labelClass}>{t(lang, "scheduledDateLabel")}</label>
                <input
                  type="date"
                  name="scheduledDate"
                  defaultValue={initial.scheduledDate}
                  className={inputClass}
                />
              </div>
              <div className="field">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1 text-xs">
                    {t(lang, "startTimeLabel")}
                    <input
                      type="time"
                      name="startTime"
                      defaultValue={initial.startTime ?? ""}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">
                    {t(lang, "endTimeLabel")}
                    <input
                      type="time"
                      name="endTime"
                      defaultValue={initial.endTime ?? ""}
                      className={inputClass}
                    />
                  </label>
                </div>
                <p style={{ fontSize: 11, color: "var(--color-neutral-600)", margin: "5px 0 0" }}>
                  {t(lang, "lectureTimeOverrideHint", courseTimeLabel)}
                </p>
              </div>
              <div className="dialog-actions">
                <button type="button" onClick={close} className={btnSecondary}>
                  {t(lang, "cancel")}
                </button>
                <button type="submit" disabled={pending} className={btnPrimary}>
                  {pending ? t(lang, "saving") : t(lang, "save")}
                </button>
              </div>
            </div>
          )}
        </ActionForm>
      )}
    </Modal>
  );
}
