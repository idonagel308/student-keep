"use client";

import { HomeworkForm } from "@/components/forms/HomeworkForm";
import { DeleteButton } from "@/components/DeleteButton";
import {
  updateHomework,
  toggleHomework,
  deleteHomework,
  removeHomeworkFile,
} from "@/app/actions/homework";
import { formatDate, formatDateInput, dueLabel, dueStatus } from "@/lib/format";
import { CheckIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import type { Homework } from "@/generated/prisma/client";

const dueColors: Record<string, string> = {
  overdue: "var(--color-accent-2)",
  today: "var(--color-accent-700)",
  upcoming: "var(--color-neutral-600)",
};

export function HomeworkItem({ hw, lang }: { hw: Homework; lang: Lang }) {
  return (
    <li className="card" style={{ padding: 14, gap: 8 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <form action={toggleHomework as (fd: FormData) => void} style={{ paddingTop: 2 }}>
          <input type="hidden" name="id" value={hw.id} />
          <input type="hidden" name="courseId" value={hw.courseId} />
          <button
            type="submit"
            className="check-box"
            aria-pressed={hw.completed}
            aria-label={hw.completed ? t(lang, "markNotDone") : t(lang, "markDone")}
          >
            <CheckIcon checked={hw.completed} />
          </button>
        </form>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <h3
              style={{
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                color: hw.completed ? "var(--color-neutral-500)" : "inherit",
                textDecoration: hw.completed ? "line-through" : "none",
              }}
            >
              {hw.name}
            </h3>
            {hw.dueDate && (
              <span style={{ fontSize: 12, color: dueColors[dueStatus(hw.dueDate)] }}>
                {formatDate(hw.dueDate)} · {dueLabel(hw.dueDate)}
              </span>
            )}
          </div>

          {hw.details && (
            <p
              style={{
                marginTop: 4,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                color: "var(--color-neutral-700)",
              }}
            >
              {hw.details}
            </p>
          )}

          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {hw.assignmentFileUrl && (
              <FileChip
                url={hw.assignmentFileUrl}
                label={t(lang, "assignmentFileChip")}
                removeAction={removeHomeworkFile}
                hwId={hw.id}
                courseId={hw.courseId}
                which="assignment"
                lang={lang}
              />
            )}
            {hw.answerFileUrl && (
              <FileChip
                url={hw.answerFileUrl}
                label={t(lang, "answerFileChip")}
                removeAction={removeHomeworkFile}
                hwId={hw.id}
                courseId={hw.courseId}
                which="answer"
                lang={lang}
              />
            )}
          </div>

          {hw.answerText && (
            <div
              style={{
                marginTop: 8,
                borderRadius: "var(--radius-md)",
                background: "var(--color-bg)",
                padding: 10,
              }}
            >
              <p style={{ marginBottom: 4, fontSize: 11, fontWeight: 600, color: "var(--color-neutral-600)" }}>
                {t(lang, "myTypedAnswer")}
              </p>
              <p style={{ whiteSpace: "pre-wrap", fontSize: 13, margin: 0 }}>{hw.answerText}</p>
            </div>
          )}

          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <HomeworkForm
              action={updateHomework}
              courseId={hw.courseId}
              title={t(lang, "editHomeworkTitle")}
              triggerLabel={t(lang, "edit")}
              triggerClassName="btn btn-ghost"
              triggerAriaLabel={`${t(lang, "edit")} ${hw.name}`}
              lang={lang}
              initial={{
                id: hw.id,
                name: hw.name,
                details: hw.details,
                dueDate: hw.dueDate ? formatDateInput(hw.dueDate) : "",
                answerText: hw.answerText,
                assignmentFileName: hw.assignmentFileName,
                answerFileName: hw.answerFileName,
              }}
            />
            <DeleteButton
              action={deleteHomework}
              hidden={{ id: hw.id, courseId: hw.courseId }}
              label={t(lang, "delete")}
              ariaLabel={`${t(lang, "delete")} ${hw.name}`}
              className="btn btn-ghost-danger"
              confirmMessage={t(lang, "deleteHomeworkConfirm")}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

function FileChip({
  url,
  label,
  removeAction,
  hwId,
  courseId,
  which,
  lang,
}: {
  url: string;
  label: string;
  removeAction: (fd: FormData) => Promise<unknown>;
  hwId: string;
  courseId: string;
  which: string;
  lang: Lang;
}) {
  return (
    <span className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <a href={url} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
      <form action={removeAction as (fd: FormData) => void}>
        <input type="hidden" name="id" value={hwId} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="which" value={which} />
        <button
          type="submit"
          style={{ color: "var(--color-accent-2)", background: "none", border: 0, cursor: "pointer" }}
          aria-label={t(lang, "removeFileAria", which)}
        >
          ✕
        </button>
      </form>
    </span>
  );
}
