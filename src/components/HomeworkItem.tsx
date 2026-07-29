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
import type { Homework } from "@/generated/prisma/client";

const dueStyles: Record<string, string> = {
  overdue: "text-red-600 dark:text-red-400",
  today: "text-amber-600 dark:text-amber-400",
  upcoming: "text-slate-500 dark:text-slate-400",
};

export function HomeworkItem({ hw }: { hw: Homework }) {
  return (
    <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-start gap-3">
        <form action={toggleHomework as (fd: FormData) => void} className="pt-0.5">
          <input type="hidden" name="id" value={hw.id} />
          <input type="hidden" name="courseId" value={hw.courseId} />
          <button
            type="submit"
            aria-label={hw.completed ? "Mark incomplete" : "Mark complete"}
            className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
              hw.completed
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
            }`}
          >
            {hw.completed ? "✓" : ""}
          </button>
        </form>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              className={`font-medium ${
                hw.completed ? "text-slate-400 line-through dark:text-slate-500" : ""
              }`}
            >
              {hw.name}
            </h3>
            {hw.dueDate && (
              <span className={`text-xs ${dueStyles[dueStatus(hw.dueDate)]}`}>
                {formatDate(hw.dueDate)} · {dueLabel(hw.dueDate)}
              </span>
            )}
          </div>

          {hw.details && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
              {hw.details}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {hw.assignmentFileUrl && (
              <FileChip
                url={hw.assignmentFileUrl}
                label="📎 Assignment"
                removeAction={removeHomeworkFile}
                hwId={hw.id}
                courseId={hw.courseId}
                which="assignment"
              />
            )}
            {hw.answerFileUrl && (
              <FileChip
                url={hw.answerFileUrl}
                label="✍️ My answer (PDF)"
                removeAction={removeHomeworkFile}
                hwId={hw.id}
                courseId={hw.courseId}
                which="answer"
              />
            )}
          </div>

          {hw.answerText && (
            <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
              <p className="mb-1 text-xs font-medium text-slate-500">
                My typed answer
              </p>
              <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                {hw.answerText}
              </p>
            </div>
          )}

          <div className="mt-3 flex items-center gap-3 text-sm">
            <HomeworkForm
              action={updateHomework}
              courseId={hw.courseId}
              title="Edit homework"
              triggerLabel="Edit"
              triggerClassName="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
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
              label="Delete"
              className="text-red-500 hover:text-red-700"
              confirmMessage="Delete this homework item?"
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
}: {
  url: string;
  label: string;
  removeAction: (fd: FormData) => Promise<unknown>;
  hwId: string;
  courseId: string;
  which: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-700 hover:underline dark:text-slate-200"
      >
        {label}
      </a>
      <form action={removeAction as (fd: FormData) => void}>
        <input type="hidden" name="id" value={hwId} />
        <input type="hidden" name="courseId" value={courseId} />
        <input type="hidden" name="which" value={which} />
        <button
          type="submit"
          className="text-red-500 hover:text-red-700"
          aria-label={`Remove ${which} file`}
        >
          ✕
        </button>
      </form>
    </span>
  );
}
