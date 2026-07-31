"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

type CourseValues = {
  id: string;
  name: string;
  totalLectures: number;
  credits: number | null;
  color: string | null;
  dayOfWeek: number | null;
};

const COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];

const DAY_OF_WEEK_KEYS = [
  "daySun",
  "dayMon",
  "dayTue",
  "dayWed",
  "dayThu",
  "dayFri",
  "daySat",
] as const;

export function CourseForm({
  action,
  semesterId,
  initial,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
  title,
  lang,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  semesterId: string;
  initial?: CourseValues;
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
              <input type="hidden" name="semesterId" value={semesterId} />
              {initial && <input type="hidden" name="id" value={initial.id} />}
              <div className="field">
                <label className={labelClass}>{t(lang, "courseName")}</label>
                <input
                  name="name"
                  required
                  defaultValue={initial?.name}
                  placeholder="e.g. Linear Algebra"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className={labelClass}>{t(lang, "totalLectures")}</label>
                  <input
                    type="number"
                    name="totalLectures"
                    min={0}
                    required
                    defaultValue={initial?.totalLectures ?? 12}
                    className={inputClass}
                  />
                </div>
                <div className="field">
                  <label className={labelClass}>{t(lang, "creditsOptional")}</label>
                  <input
                    type="number"
                    step="0.5"
                    name="credits"
                    min={0}
                    defaultValue={initial?.credits ?? ""}
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="field">
                <label className={labelClass}>{t(lang, "dayOfWeekOptional")}</label>
                <select
                  name="dayOfWeek"
                  defaultValue={initial?.dayOfWeek ?? ""}
                  className={inputClass}
                >
                  <option value="">{t(lang, "none")}</option>
                  {DAY_OF_WEEK_KEYS.map((key, i) => (
                    <option key={key} value={i}>
                      {t(lang, key)}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: "var(--color-neutral-600)", margin: "5px 0 0" }}>
                  {t(lang, "dayOfWeekHint")}
                </p>
              </div>
              <div className="field">
                <label className={labelClass}>{t(lang, "colorTagOptional")}</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="color"
                      value=""
                      defaultChecked={!initial?.color}
                    />
                    {t(lang, "none")}
                  </label>
                  {COLORS.map((c) => (
                    <label key={c} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={c}
                        defaultChecked={initial?.color === c}
                        className="peer sr-only"
                      />
                      <span
                        className="block h-6 w-6 rounded-full ring-offset-2 ring-offset-[var(--color-surface)] peer-checked:ring-2 peer-checked:ring-[var(--color-accent)]"
                        style={{ backgroundColor: c }}
                      />
                    </label>
                  ))}
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
