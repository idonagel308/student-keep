"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";
import { EditIcon } from "@/components/icons";

type LectureValues = {
  id: string;
  number: number;
  title: string | null;
  scheduledDate: string;
};

export function LectureForm({
  action,
  initial,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initial: LectureValues;
}) {
  return (
    <Modal
      title={`Edit lecture ${initial.number}`}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="btn btn-icon btn-ghost"
          aria-label={`Edit lecture ${initial.number}`}
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
                <label className={labelClass}>Title (optional)</label>
                <input
                  name="title"
                  defaultValue={initial.title ?? ""}
                  placeholder="e.g. Uniform continuity"
                  className={inputClass}
                />
              </div>
              <div className="field">
                <label className={labelClass}>Scheduled date</label>
                <input
                  type="date"
                  name="scheduledDate"
                  defaultValue={initial.scheduledDate}
                  className={inputClass}
                />
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
