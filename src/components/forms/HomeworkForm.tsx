"use client";

import { Modal } from "@/components/Modal";
import { ActionForm, type ActionState } from "@/components/ActionForm";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";

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
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  courseId: string;
  initial?: HomeworkValues;
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
              <input type="hidden" name="courseId" value={courseId} />
              {initial && <input type="hidden" name="id" value={initial.id} />}

              <div className="field">
                <label className={labelClass}>Assignment name</label>
                <input
                  name="name"
                  required
                  defaultValue={initial?.name}
                  placeholder="e.g. Problem set 3"
                  className={inputClass}
                />
              </div>

              <div className="field">
                <label className={labelClass}>Details / task description</label>
                <textarea
                  name="details"
                  rows={3}
                  defaultValue={initial?.details ?? ""}
                  placeholder="What's the task?"
                  className={inputClass}
                />
              </div>

              <div className="field">
                <label className={labelClass}>Due date</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={initial?.dueDate}
                  className={inputClass}
                />
              </div>

              <div className="field">
                <label className={labelClass}>
                  Assignment PDF (instructions, optional)
                </label>
                <input
                  type="file"
                  name="assignmentFile"
                  accept="application/pdf"
                  className="text-sm"
                />
                {initial?.assignmentFileName && (
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--color-neutral-600)" }}
                  >
                    Current: {initial.assignmentFileName} — choose a file to
                    replace.
                  </p>
                )}
              </div>

              <div
                className="rounded-lg p-3"
                style={{ border: "1px solid var(--color-divider)" }}
              >
                <p className="mb-2 text-sm font-medium">My answer</p>
                <label className={labelClass}>Typed answer</label>
                <textarea
                  name="answerText"
                  rows={3}
                  defaultValue={initial?.answerText ?? ""}
                  placeholder="Type your answer here (optional)"
                  className={inputClass}
                />
                <div className="mt-3 field">
                  <label className={labelClass}>Or upload answer PDF</label>
                  <input
                    type="file"
                    name="answerFile"
                    accept="application/pdf"
                    className="text-sm"
                  />
                  {initial?.answerFileName && (
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--color-neutral-600)" }}
                    >
                      Current: {initial.answerFileName} — choose a file to
                      replace.
                    </p>
                  )}
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
