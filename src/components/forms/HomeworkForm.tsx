"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { PdfFileInput } from "@/components/forms/PdfFileInput";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

type HomeworkValues = {
  id: string;
  name: string;
  details: string | null;
  dueDate: string;
  answerText: string | null;
  assignmentFileName: string | null;
  answerFileName: string | null;
};

export function HomeworkForm({
  action,
  courseId,
  initial,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
  title,
  lang,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  courseId: string;
  initial?: HomeworkValues;
  triggerLabel: React.ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  title: string;
  lang: Lang;
}) {
  return (
    <Modal
      closeLabel={t(lang, "close")}
      title={title}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className={triggerClassName ?? btnPrimary}
          aria-label={triggerAriaLabel}
        >
          {triggerLabel}
        </button>
      )}
    >
      {(close) => (
        <ActionForm action={action} onSuccess={close}>
          {(pending) => (
            <div className="space-y-4">
              <input type="hidden" name="courseId" value={courseId} />
              {initial && <input type="hidden" name="id" value={initial.id} />}

              <div className="field">
                <label className={labelClass}>{t(lang, "assignmentName")}</label>
                <input
                  name="name"
                  required
                  defaultValue={initial?.name}
                  placeholder="e.g. Problem set 3"
                  className={inputClass}
                />
              </div>

              <div className="field">
                <label className={labelClass}>{t(lang, "detailsLabel")}</label>
                <textarea
                  name="details"
                  rows={3}
                  defaultValue={initial?.details ?? ""}
                  placeholder="What's the task?"
                  className={inputClass}
                />
              </div>

              <div className="field">
                <label className={labelClass}>{t(lang, "dueDateLabel")}</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={initial?.dueDate}
                  className={inputClass}
                />
              </div>

              <div className="field">
                <label className={labelClass}>{t(lang, "assignmentPdfLabel")}</label>
                <PdfFileInput
                  name="assignmentFile"
                  currentFileName={initial?.assignmentFileName}
                  lang={lang}
                />
              </div>

              <div
                className="rounded-lg p-3"
                style={{ border: "1px solid var(--color-divider)" }}
              >
                <p className="mb-2 text-sm font-medium">{t(lang, "myAnswer")}</p>
                <label className={labelClass}>{t(lang, "typedAnswer")}</label>
                <textarea
                  name="answerText"
                  rows={3}
                  defaultValue={initial?.answerText ?? ""}
                  placeholder="Type your answer here (optional)"
                  className={inputClass}
                />
                <div className="mt-3 field">
                  <label className={labelClass}>{t(lang, "uploadAnswerPdf")}</label>
                  <PdfFileInput
                    name="answerFile"
                    currentFileName={initial?.answerFileName}
                    lang={lang}
                  />
                </div>
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
