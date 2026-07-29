"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import {
  toggleLecture,
  uploadLectureSummary,
  removeLectureSummary,
} from "@/app/actions/lectures";
import type { Lecture } from "@/generated/prisma/client";

export function LectureRow({ lecture }: { lecture: Lecture }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-2.5 last:border-0 dark:border-slate-800">
      <form action={toggleLecture as (fd: FormData) => void}>
        <input type="hidden" name="id" value={lecture.id} />
        <input type="hidden" name="courseId" value={lecture.courseId} />
        <button
          type="submit"
          aria-label={lecture.watched ? "Mark as not watched" : "Mark as watched"}
          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
            lecture.watched
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
          }`}
        >
          {lecture.watched ? "✓" : ""}
        </button>
      </form>

      <span
        className={`min-w-0 flex-1 text-sm ${
          lecture.watched
            ? "text-slate-400 line-through dark:text-slate-500"
            : ""
        }`}
      >
        Lecture {lecture.number}
        {lecture.title ? ` — ${lecture.title}` : ""}
      </span>

      {lecture.summaryFileUrl ? (
        <div className="flex items-center gap-2">
          <a
            href={lecture.summaryFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title={lecture.summaryFileName ?? "Summary PDF"}
          >
            📄 Summary
          </a>
          <form action={removeLectureSummary as (fd: FormData) => void}>
            <input type="hidden" name="id" value={lecture.id} />
            <input type="hidden" name="courseId" value={lecture.courseId} />
            <button
              type="submit"
              className="text-xs text-red-500 hover:text-red-700"
              aria-label="Remove summary"
            >
              ✕
            </button>
          </form>
        </div>
      ) : showUpload ? (
        <ActionForm
          action={uploadLectureSummary}
          onSuccess={() => setShowUpload(false)}
          className="flex items-center gap-2"
        >
          {(pending) => (
            <>
              <input type="hidden" name="id" value={lecture.id} />
              <input type="hidden" name="courseId" value={lecture.courseId} />
              <input
                type="file"
                name="file"
                accept="application/pdf"
                required
                className="max-w-[180px] text-xs"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-indigo-600 px-2 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {pending ? "Uploading…" : "Upload"}
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="text-xs text-slate-500"
              >
                Cancel
              </button>
            </>
          )}
        </ActionForm>
      ) : (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
        >
          + Add PDF
        </button>
      )}
    </li>
  );
}
