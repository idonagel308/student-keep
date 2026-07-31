"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { ActionForm } from "@/components/ActionForm";
import { setCourseGrade } from "@/app/actions/courses";
import { inputClass, labelClass, btnPrimary, btnSecondary } from "@/components/ui";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

export function CourseGrade({
  courseId,
  examScore,
  passGrade,
  lang,
}: {
  courseId: string;
  examScore: number | null;
  passGrade: boolean;
  lang: Lang;
}) {
  const [gradeMode, setGradeMode] = useState<"score" | "pass">(passGrade ? "pass" : "score");
  const graded = passGrade || examScore !== null;
  const passed = passGrade || (examScore !== null && examScore >= 60);

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
          {t(lang, "finalExam")}
        </div>
        <div
          style={{
            fontSize: passGrade ? 24 : 38,
            fontWeight: 600,
            lineHeight: passGrade ? 1.5 : 1,
            fontFeatureSettings: "'tnum' 1",
            color: !graded ? "var(--color-neutral-500)" : passed ? "var(--color-accent-700)" : "var(--color-accent-2)",
          }}
        >
          {passGrade ? t(lang, "passed") : examScore !== null ? examScore : "—"}
        </div>
        {!passGrade && (
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)", marginTop: 8 }}>
            {graded ? (passed ? t(lang, "passed") : t(lang, "failed")) : t(lang, "notGradedYet")}
          </div>
        )}
      </div>
      <Modal
        closeLabel={t(lang, "close")}
        title={graded ? t(lang, "editGrade") : t(lang, "enterGrade")}
        trigger={(open) => (
          <button type="button" onClick={open} className="btn btn-secondary" style={{ fontSize: "12.5px" }}>
            {graded ? t(lang, "editGrade") : t(lang, "enterGrade")}
          </button>
        )}
      >
        {(close) => (
          <ActionForm action={setCourseGrade} onSuccess={close} resetOnSuccess={false}>
            {(pending) => (
              <div className="space-y-4">
                <input type="hidden" name="id" value={courseId} />
                <div className="field">
                  <label className={labelClass}>{t(lang, "gradeTypeLabel")}</label>
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="radio">
                      <input
                        type="radio"
                        name="gradeMode"
                        value="score"
                        checked={gradeMode === "score"}
                        onChange={() => setGradeMode("score")}
                      />
                      <span className="dot" />
                      {t(lang, "numericGradeOption")}
                    </label>
                    <label className="radio">
                      <input
                        type="radio"
                        name="gradeMode"
                        value="pass"
                        checked={gradeMode === "pass"}
                        onChange={() => setGradeMode("pass")}
                      />
                      <span className="dot" />
                      {t(lang, "passGradeOption")}
                    </label>
                  </div>
                </div>
                {gradeMode === "score" && (
                  <div className="field">
                    <label className={labelClass}>{t(lang, "examScoreLabel")}</label>
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
                      {t(lang, "gradeOutOf100")}
                    </p>
                  </div>
                )}
                {gradeMode === "pass" && (
                  <p style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                    {t(lang, "passGradeHint")}
                  </p>
                )}
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
    </div>
  );
}
