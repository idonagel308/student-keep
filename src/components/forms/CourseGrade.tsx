"use client";

import { Modal } from "@/components/Modal";
import { ActionForm } from "@/components/ActionForm";
import { setCourseGrade } from "@/app/actions/courses";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";

export function CourseGrade({
  courseId,
  examScore,
}: {
  courseId: string;
  examScore: number | null;
}) {
  const graded = examScore !== null;
  const passed = graded && examScore >= 60;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 20,
        flexWrap: "wrap",
        marginTop: 22,
      }}
    >
      <div style={{ flex: 1, minWidth: 130 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: 8,
          }}
        >
          Final exam
        </div>
        <div
          style={{
            fontSize: 38,
            fontWeight: 600,
            lineHeight: 1,
            fontFeatureSettings: "'tnum' 1",
            color: !graded ? "var(--color-neutral-500)" : passed ? "var(--color-accent-700)" : "var(--color-accent-2)",
          }}
        >
          {graded ? examScore : "—"}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-neutral-600)", marginTop: 8 }}>
          {graded ? (passed ? "Passed" : "Failed") : "Not graded yet"}
        </div>
      </div>
      <Modal
        title={graded ? "Edit grade" : "Enter grade"}
        trigger={(open) => (
          <button type="button" onClick={open} className="btn btn-secondary" style={{ fontSize: "12.5px" }}>
            {graded ? "Edit grade" : "Enter grade"}
          </button>
        )}
      >
        {(close) => (
          <ActionForm action={setCourseGrade} onSuccess={close} resetOnSuccess={false}>
            {(pending) => (
              <div className="space-y-4">
                <input type="hidden" name="id" value={courseId} />
                <div className="field">
                  <label className={labelClass}>Final exam score</label>
                  <input
                    type="number"
                    name="examScore"
                    min={0}
                    max={100}
                    step="0.1"
                    defaultValue={examScore ?? ""}
                    className={inputClass}
                  />
                  <p style={{ marginTop: 4, fontSize: 12, color: "var(--color-neutral-600)" }}>
                    Out of 100. Leave empty if the course has no final exam.
                  </p>
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
    </div>
  );
}
