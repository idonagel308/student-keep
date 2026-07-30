"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";

type CourseValues = {
  id: string;
  name: string;
  totalLectures: number;
  credits: number | null;
  color: string | null;
};

const COLORS = ["#6366f1", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];

export function CourseForm({
  action,
  semesterId,
  initial,
  triggerLabel,
  triggerClassName,
  triggerAriaLabel,
  title,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  semesterId: string;
  initial?: CourseValues;
  triggerLabel: React.ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  title: string;
}) {
  return (
    <Modal
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
                <label className={labelClass}>Course name</label>
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
                  <label className={labelClass}>Total lectures</label>
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
                  <label className={labelClass}>Credits (optional)</label>
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
                <label className={labelClass}>Color tag (optional)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="radio"
                      name="color"
                      value=""
                      defaultChecked={!initial?.color}
                    />
                    None
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
                  Cancel
                </button>
                <button type="submit" disabled={pending} className={btnPrimary}>
                  {pending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )}
        </ActionForm>
      )}
    </Modal>
  );
}
