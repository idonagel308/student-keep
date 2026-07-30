"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import {
  toggleLecture,
  uploadLectureSummary,
  removeLectureSummary,
  updateLecture,
} from "@/app/actions/lectures";
import { LectureForm } from "@/components/forms/LectureForm";
import { formatDate, formatDateInput } from "@/lib/format";
import { CheckIcon, PdfIcon, AttachIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import type { Lecture } from "@/generated/prisma/client";

export function LectureRow({ lecture, lang }: { lecture: Lecture; lang: Lang }) {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <li
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 12,
        padding: "10px 4px",
        borderBottom: "1px solid var(--color-divider)",
      }}
    >
      <form action={toggleLecture as (fd: FormData) => void}>
        <input type="hidden" name="id" value={lecture.id} />
        <input type="hidden" name="courseId" value={lecture.courseId} />
        <button
          type="submit"
          className="check-box"
          aria-pressed={lecture.watched}
          aria-label={lecture.watched ? t(lang, "markUnwatched") : t(lang, "markWatched")}
        >
          <CheckIcon checked={lecture.watched} />
        </button>
      </form>

      <span style={{ flex: "none", fontSize: "11.5px", color: "var(--color-neutral-500)", width: 20 }}>
        {lecture.number}
      </span>

      <span
        style={{
          minWidth: 0,
          flex: 1,
          fontSize: 14,
          color: lecture.watched ? "var(--color-neutral-500)" : "var(--color-text)",
          textDecoration: lecture.watched ? "line-through" : "none",
        }}
      >
        {lecture.title || t(lang, "lectureNumber", lecture.number)}
      </span>

      <span style={{ flex: "none", fontSize: 11.5, color: "var(--color-neutral-500)", fontFeatureSettings: "'tnum' 1" }}>
        {lecture.scheduledDate ? formatDate(lecture.scheduledDate) : t(lang, "noDate")}
      </span>

      {lecture.summaryFileUrl ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <a
            href={lecture.summaryFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
            style={{ fontSize: 11, gap: 5 }}
            title={lecture.summaryFileName ?? "Summary PDF"}
          >
            <PdfIcon />
            {t(lang, "summary")}
          </a>
          <form action={removeLectureSummary as (fd: FormData) => void}>
            <input type="hidden" name="id" value={lecture.id} />
            <input type="hidden" name="courseId" value={lecture.courseId} />
            <button
              type="submit"
              className="btn btn-icon btn-ghost-danger"
              style={{ width: 24, height: 24 }}
              aria-label={t(lang, "removeSummary")}
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
              <button type="submit" disabled={pending} className="btn btn-primary" style={{ fontSize: 12 }}>
                {pending ? t(lang, "uploading") : t(lang, "upload")}
              </button>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
              >
                {t(lang, "cancel")}
              </button>
            </>
          )}
        </ActionForm>
      ) : (
        <button
          type="button"
          onClick={() => setShowUpload(true)}
          className="btn btn-icon btn-ghost"
          aria-label={t(lang, "attach")}
        >
          <AttachIcon />
        </button>
      )}

      <LectureForm
        action={updateLecture}
        lang={lang}
        initial={{
          id: lecture.id,
          number: lecture.number,
          title: lecture.title,
          scheduledDate: lecture.scheduledDate ? formatDateInput(lecture.scheduledDate) : "",
        }}
      />
    </li>
  );
}
