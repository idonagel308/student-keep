"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

type DegreeCourse = {
  id: string;
  name: string;
  courseNumber: string | null;
  semesterName: string;
  color: string | null;
  credits: number | null;
  examScore: number | null;
  passGrade: boolean;
};

function gradeStyle(examScore: number | null, passGrade: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    flex: "none",
    fontSize: 12,
    padding: "3px 9px",
    borderRadius: "var(--radius-md)",
    fontFeatureSettings: "'tnum' 1",
  };
  if (passGrade) return { ...base, background: "var(--color-accent-100)", color: "var(--color-accent-800)" };
  if (examScore === null) return { ...base, color: "var(--color-neutral-500)" };
  return examScore >= 60
    ? { ...base, background: "var(--color-accent-100)", color: "var(--color-accent-800)" }
    : { ...base, background: "var(--color-accent-2-100)", color: "var(--color-accent-2-800)" };
}

export function DegreeCourseList({ courses, lang }: { courses: DegreeCourse[]; lang: Lang }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const pool = courses.filter(
    (c) => !q || `${c.name} ${c.courseNumber ?? ""} ${c.semesterName}`.toLowerCase().includes(q)
  );
  const list = q
    ? [...pool].sort((a, b) => a.name.localeCompare(b.name))
    : pool
        .filter((c) => c.examScore !== null || c.passGrade)
        .sort((a, b) => {
          const av = a.passGrade ? Infinity : (a.examScore ?? -Infinity);
          const bv = b.passGrade ? Infinity : (b.examScore ?? -Infinity);
          return bv - av;
        });

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20, maxWidth: 340 }}>
        <input
          type="search"
          placeholder={t(lang, "searchCourses")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          style={{ padding: "8px 11px", fontSize: "13.5px" }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {list.map((c) => (
          <Link
            key={c.id}
            href={`/courses/${c.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 13,
              padding: "11px 10px",
              margin: "0 -10px",
              borderRadius: "var(--radius-md)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c.color ?? "var(--color-accent)",
                flex: "none",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "14.5px" }}>
                {c.name}
                {c.courseNumber && (
                  <span style={{ color: "var(--color-neutral-600)" }}> · {c.courseNumber}</span>
                )}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--color-neutral-600)", marginTop: 3 }}>
                {c.semesterName}
                {c.credits != null ? ` · ${t(lang, "creditsCount", c.credits)}` : ""}
              </div>
            </div>
            <span style={gradeStyle(c.examScore, c.passGrade)}>
              {c.passGrade ? t(lang, "passed") : c.examScore === null ? "—" : c.examScore}
            </span>
          </Link>
        ))}
      </div>
      {list.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--color-neutral-600)", fontStyle: "italic" }}>
          {q ? t(lang, "noMatches") : t(lang, "noGrades")}
        </p>
      )}
    </>
  );
}
