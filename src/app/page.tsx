import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toggleHomework } from "@/app/actions/homework";
import { CheckIcon } from "@/components/icons";
import { formatDate, dueLabel, dueStatus } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";
import { WeekCalendar } from "@/components/WeekCalendar";
import { WeekLectures } from "@/components/WeekLectures";
import { WeekNav } from "@/components/WeekNav";
import { GoogleNotice } from "@/components/GoogleNotice";
import { SemesterPace } from "@/components/SemesterPace";
import { resolveWeek } from "@/lib/weekNav";
import { buildWeekView } from "@/lib/weekView";

export const dynamic = "force-dynamic";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const lang = await getLang();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      courses: { include: { lectures: true, homework: true } },
    },
  });

  const now = new Date();
  const nav = resolveWeek(params.week, now);
  const { weekStart, weekEnd, isCurrentWeek } = nav;
  const { semester, dueRows, lectureRows, calendarItems, overdueCount } = buildWeekView(semesters, {
    weekStart,
    weekEnd,
    isCurrentWeek,
    now,
    lectureLabel: (n) => t(lang, "lectureNumber", n),
  });

  // buildWeekView's slimmer semester type isn't enough for pace; take the full row.
  const fullSemester = semesters.find((s) => s.id === semester?.id);

  const range = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
  const headline = isCurrentWeek
    ? dueRows.length === 0
      ? t(lang, "nothingDueThisWeek")
      : overdueCount > 0
        ? t(lang, "overdueCount", overdueCount)
        : t(lang, "dueCount", dueRows.length)
    : dueRows.length === 0
      ? t(lang, "nothingDueThatWeek")
      : t(lang, "dueCountThatWeek", dueRows.length);
  const noSemester = isCurrentWeek ? t(lang, "noSemesterInProgress") : t(lang, "noSemesterThatWeek");

  return (
    <div className="animate-in" style={{ paddingTop: 52 }}>
      <GoogleNotice google={first(params.google)} error={first(params.error)} lang={lang} />
      <div style={{ maxWidth: 660 }}>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: 9,
          }}
        >
          {t(lang, "weekOf", range)}
        </div>
        <WeekNav nav={nav} lang={lang} rangeLabel={range} />
        <h1 style={{ fontSize: "clamp(38px,6vw,56px)", margin: "0 0 12px" }}>{headline}</h1>
        <p style={{ fontSize: 16, color: "var(--color-neutral-600)", margin: 0 }}>
          {semester
            ? `${semester.name} · ${formatDate(semester.startDate)} – ${formatDate(semester.endDate)}`
            : noSemester}
        </p>
      </div>

      {fullSemester && (
        <div style={{ marginTop: 28 }}>
          <SemesterPace semester={fullSemester} now={now} lang={lang} />
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 40,
          marginTop: 42,
        }}
      >
        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>
            {isCurrentWeek ? t(lang, "dueThisWeek") : t(lang, "dueThatWeek")}
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--color-neutral-600)", margin: "0 0 20px" }}>
            {!isCurrentWeek
              ? t(lang, "dueBetween", range)
              : overdueCount > 0
                ? t(lang, "overdueFirst")
                : t(lang, "byEndOfWeek")}
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {dueRows.map((r) => (
              <div
                key={r.homeworkId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 13,
                  padding: 10,
                  margin: "0 -10px",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <form action={toggleHomework as (fd: FormData) => void}>
                  <input type="hidden" name="id" value={r.homeworkId} />
                  <input type="hidden" name="courseId" value={r.courseId} />
                  <button type="submit" className="check-box" aria-label={`${t(lang, "markDone")}: ${r.name}`}>
                    <CheckIcon checked={false} />
                  </button>
                </form>
                <Link href={`/courses/${r.courseId}`} style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: "14.5px" }}>{r.name}</span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "11.5px",
                      color: "var(--color-neutral-600)",
                      marginTop: 3,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: r.courseColor ?? "var(--color-accent)",
                      }}
                    />
                    {r.courseName}
                  </span>
                </Link>
                <span
                  style={{
                    flex: "none",
                    fontSize: "11.5px",
                    color:
                      dueStatus(r.dueDate) === "overdue" ? "var(--color-accent-2)" : "var(--color-neutral-600)",
                  }}
                >
                  {dueLabel(r.dueDate)}
                </span>
              </div>
            ))}
          </div>
          {dueRows.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--color-neutral-600)", fontStyle: "italic" }}>
              {isCurrentWeek ? t(lang, "emptyDue") : t(lang, "nothingDueThatWeek")}
            </p>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>
            {isCurrentWeek ? t(lang, "lecturesThisWeek") : t(lang, "lecturesThatWeek")}
          </h2>
          <p style={{ fontSize: "12.5px", color: "var(--color-neutral-600)", margin: "0 0 20px" }}>
            {semester ? t(lang, "scheduledBetween", range) : "—"}
          </p>
          <WeekLectures rows={lectureRows} lang={lang} now={now} />
          {lectureRows.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--color-neutral-600)", fontStyle: "italic" }}>
              {!semester
                ? noSemester
                : isCurrentWeek
                  ? t(lang, "emptyLectures")
                  : t(lang, "emptyLecturesThatWeek")}
            </p>
          )}
        </section>
      </div>

      <WeekCalendar
        // Keyed by week so a day expanded with "+N more" doesn't stay expanded
        // on the next week.
        key={weekStart.toISOString()}
        weekStart={weekStart}
        items={calendarItems}
        lang={lang}
        title={isCurrentWeek ? t(lang, "weekAtAGlance") : t(lang, "weekAtAGlanceOther")}
      />
    </div>
  );
}
