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
  title,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  courseId: string;
  initial?: HomeworkValues;
  triggerLabel: React.ReactNode;
  triggerClassName?: string;
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

              <div>
                <label className={labelClass}>Assignment name</label>
                <input
                  name="name"
                  required
                  defaultValue={initial?.name}
                  placeholder="e.g. Problem set 3"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Details / task description</label>
                <textarea
                  name="details"
                  rows={3}
                  defaultValue={initial?.details ?? ""}
                  placeholder="What's the task?"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Due date</label>
                <input
                  type="date"
                  name="dueDate"
                  defaultValue={initial?.dueDate}
                  className={inputClass}
                />
              </div>

              <div>
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
                  <p className="mt-1 text-xs text-slate-500">
                    Current: {initial.assignmentFileName} — choose a file to
                    replace.
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <p className="mb-2 text-sm font-medium">My answer</p>
                <label className={labelClass}>Typed answer</label>
                <textarea
                  name="answerText"
                  rows={3}
                  defaultValue={initial?.answerText ?? ""}
                  placeholder="Type your answer here (optional)"
                  className={inputClass}
                />
                <div className="mt-3">
                  <label className={labelClass}>Or upload answer PDF</label>
                  <input
                    type="file"
                    name="answerFile"
                    accept="application/pdf"
                    className="text-sm"
                  />
                  {initial?.answerFileName && (
                    <p className="mt-1 text-xs text-slate-500">
                      Current: {initial.answerFileName} — choose a file to
                      replace.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
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
