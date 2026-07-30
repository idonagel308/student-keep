"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";

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
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: SemesterValues;
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
              {initial && <input type="hidden" name="id" value={initial.id} />}
              <div className="field">
                <label className={labelClass}>Semester name</label>
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
                  <label className={labelClass}>Start date</label>
                  <input
                    type="date"
                    name="startDate"
                    required
                    defaultValue={initial?.startDate}
                    className={inputClass}
                  />
                </div>
                <div className="field">
                  <label className={labelClass}>End date</label>
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
