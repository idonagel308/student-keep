"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

type SemesterValues = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
};

export function SemesterForm({
  action,
  initial,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
  title,
  lang,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: SemesterValues;
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
              {initial && <input type="hidden" name="id" value={initial.id} />}
              <div className="field">
                <label className={labelClass}>{t(lang, "semesterName")}</label>
                <input
                  name="name"
                  required
                  defaultValue={initial?.name}
                  placeholder="e.g. Spring 2026"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className={labelClass}>{t(lang, "startDate")}</label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={initial?.startDate}
                    className={inputClass}
                  />
                </div>
                <div className="field">
                  <label className={labelClass}>{t(lang, "endDate")}</label>
                  <input
                    type="date"
                    name="endDate"
                    required
                    defaultValue={initial?.endDate}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="dialog-actions">
                <button
                  type="button"
                  onClick={close}
                  className={btnSecondary}
                >
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
