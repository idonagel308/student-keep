import { semesterPace, semesterProgress, type CourseWithChildren } from "@/lib/progress";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

/**
 * The semester pace bar, shared by the semester page and the "this week"
 * page. Renders nothing unless the semester is in progress and has items.
 */
export function SemesterPace({
  semester,
  now,
  lang,
}: {
  semester: { startDate: Date; endDate: Date; courses: CourseWithChildren[] };
  now: Date;
  lang: Lang;
}) {
  const isActive = semester.startDate <= now && semester.endDate >= now;
  const sp = semesterProgress(semester.courses);
  const pace = semesterPace(semester.courses, now);
  if (!isActive || pace.totalItems === 0) return null;

  const { diff } = pace;
  const elapsed =
    semester.endDate > semester.startDate
      ? Math.max(
          0,
          Math.min(1, (now.getTime() - semester.startDate.getTime()) / (semester.endDate.getTime() - semester.startDate.getTime()))
        )
      : 0;
  const paceNote =
    diff === 0 ? t(lang, "onTrack") : diff > 0 ? t(lang, "aheadBy", diff) : t(lang, "behindBy", -diff);

  return (
    <div style={{ marginBottom: 34, maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 9 }}>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
          }}
        >
          {t(lang, "pace")}
        </span>
        <span style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", fontFeatureSettings: "'tnum' 1" }}>
          {t(lang, "semesterElapsed", Math.round(elapsed * 100))}
        </span>
      </div>
      <div style={{ position: "relative", height: 10, borderRadius: 99, background: "var(--color-neutral-300)", overflow: "visible" }}>
        <div
          style={{
            width: `${(pace.doneItems / pace.totalItems) * 100}%`,
            height: "100%",
            background: diff < 0 ? "var(--color-accent-2)" : "var(--color-accent)",
            borderRadius: 99,
            transition: "width .7s cubic-bezier(.2,.8,.3,1), background .3s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -5,
            bottom: -5,
            insetInlineStart: `${(pace.due / pace.totalItems) * 100}%`,
            width: 2,
            background: "var(--color-text)",
          }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginTop: 9 }}>
        <span style={{ fontSize: 13, color: diff < 0 ? "var(--color-accent-2)" : "var(--color-neutral-700)" }}>
          {paceNote}
        </span>
        <span style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", fontFeatureSettings: "'tnum' 1" }}>
          {t(lang, "lectureCount", sp.watched, sp.totalLectures)} · {t(lang, "homeworkCount", sp.doneHw, sp.totalHw)} · {t(lang, "expectedBy", pace.due)}
        </span>
      </div>
    </div>
  );
}
