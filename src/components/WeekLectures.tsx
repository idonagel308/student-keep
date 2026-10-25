import Link from "next/link";
import { format } from "date-fns";
import { toggleLecture } from "@/app/actions/lectures";
import { CheckIcon } from "@/components/icons";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import { groupByCalendarDay } from "@/lib/weekCalendar";

export type WeekLectureRow = {
  courseId: string;
  courseName: string;
  courseColor: string | null;
  lectureId: string;
  number: number;
  title: string | null;
  watched: boolean;
  scheduledDate: Date;
  /** Formatted effective time ("10:00–12:00"), or "" when the lecture has none. */
  timeLabel: string;
  watchedCount: number;
  totalCount: number;
};

// Indexed by Date#getDay(): Sunday first, matching the week grid.
const DAY_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"] as const;

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Rows must already be sorted by date, then time. */
export function WeekLectures({ rows, lang, now }: { rows: WeekLectureRow[]; lang: Lang; now: Date }) {
  const days = groupByCalendarDay(rows, (r) => r.scheduledDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {days.map((day) => {
        const isToday = sameCalendarDay(day.date, now);
        return (
          <div key={day.date.toISOString()}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                paddingBottom: 6,
                borderBottom: "1px solid var(--color-neutral-300)",
              }}
            >
              <h3 style={{ fontSize: 16, margin: 0 }}>{t(lang, DAY_KEYS[day.date.getDay()])}</h3>
              <span style={{ fontSize: "12.5px", color: "var(--color-neutral-600)" }}>
                {format(day.date, "MMM d")}
              </span>
              {isToday && (
                <span
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--color-accent)",
                  }}
                >
                  {t(lang, "today")}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {day.rows.map((l) => (
                <LectureItem key={l.lectureId} l={l} lang={lang} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LectureItem({ l, lang }: { l: WeekLectureRow; lang: Lang }) {
  const lectureName = l.title || t(lang, "lectureNumber", l.number);
  return (
    <div style={{ padding: "12px 10px", margin: "0 -10px", borderRadius: "var(--radius-md)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <form action={toggleLecture as (fd: FormData) => void}>
          <input type="hidden" name="id" value={l.lectureId} />
          <input type="hidden" name="courseId" value={l.courseId} />
          <button
            type="submit"
            className="check-box"
            aria-pressed={l.watched}
            aria-label={`${l.watched ? t(lang, "markUnwatched") : t(lang, "markWatched")}: ${lectureName}`}
          >
            <CheckIcon checked={l.watched} />
          </button>
        </form>
        <Link href={`/courses/${l.courseId}`} style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-neutral-600)",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: l.courseColor ?? "var(--color-accent)",
              }}
            />
            {l.courseName}
          </span>
          <span style={{ display: "block", fontSize: "14.5px", marginTop: 4 }}>{lectureName}</span>
          {l.timeLabel && (
            <span
              dir="ltr"
              style={{
                display: "block",
                fontSize: "11.5px",
                color: "var(--color-neutral-600)",
                marginTop: 2,
                fontFeatureSettings: "'tnum' 1",
              }}
            >
              {l.timeLabel}
            </span>
          )}
        </Link>
        <span
          style={{
            flex: "none",
            fontSize: "11.5px",
            color: "var(--color-neutral-500)",
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          {l.watchedCount}/{l.totalCount}
        </span>
      </div>
      <div
        style={{
          height: 5,
          borderRadius: 99,
          background: "var(--color-neutral-300)",
          overflow: "hidden",
          marginBlockStart: 11,
          marginInlineStart: 36,
        }}
      >
        <div
          style={{
            width: `${l.totalCount ? (l.watchedCount / l.totalCount) * 100 : 0}%`,
            height: "100%",
            background: l.courseColor ?? "var(--color-accent)",
            borderRadius: 99,
          }}
        />
      </div>
    </div>
  );
}
