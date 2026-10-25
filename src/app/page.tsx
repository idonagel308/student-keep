import Link from "next/link";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toggleHomework } from "@/app/actions/homework";
import { CheckIcon } from "@/components/icons";
import { formatDate, dueLabel, dueStatus } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";
import { WeekCalendar } from "@/components/WeekCalendar";
import { WeekLectures, type WeekLectureRow } from "@/components/WeekLectures";
import { formatTimeRange, resolveLectureTime, timeToMinutes } from "@/lib/lectureTime";
import type { WeekCalendarItem } from "@/lib/weekCalendar";

export const dynamic = "force-dynamic";

type DueRow = {
  courseId: string;
  courseName: string;
  courseColor: string | null;
  homeworkId: string;
  name: string;
  dueDate: Date;
};

/** What the list renders, plus the start time used only for sorting. */
type LectureRow = WeekLectureRow & { startTime: string | null };

export default async function WeekPage() {
  const user = await requireUser();
  const lang = await getLang();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      courses: { include: { lectures: true, homework: true } },
    },
  });

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  // "This week" is scoped to whichever semester is currently in progress —
  // due-homework spans every semester (below), but the lecture schedule
  // only makes sense against the one term actually running right now.
  const active = semesters.find((s) => s.startDate <= now && s.endDate >= now) ?? null;

  const dueRows: DueRow[] = [];
  for (const s of semesters) {
    for (const c of s.courses) {
      for (const h of c.homework) {
        if (h.completed || !h.dueDate || h.dueDate > weekEnd) continue;
        dueRows.push({
          courseId: c.id,
          courseName: c.name,
          courseColor: c.color,
          homeworkId: h.id,
          name: h.name,
          dueDate: h.dueDate,
        });
      }
    }
  }
  dueRows.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const overdueCount = dueRows.filter((r) => dueStatus(r.dueDate) === "overdue").length;

  const lectureRows: LectureRow[] = [];
  if (active) {
    for (const c of active.courses) {
      const watchedCount = c.lectures.filter((l) => l.watched).length;
      for (const l of c.lectures) {
        if (!l.scheduledDate || l.scheduledDate < weekStart || l.scheduledDate > weekEnd) continue;
        const time = resolveLectureTime(
          { startTime: l.startTime, endTime: l.endTime },
          { startTime: c.lectureStartTime, endTime: c.lectureEndTime }
        );
        lectureRows.push({
          courseId: c.id,
          courseName: c.name,
          courseColor: c.color,
          lectureId: l.id,
          number: l.number,
          title: l.title,
          watched: l.watched,
          scheduledDate: l.scheduledDate,
          startTime: time.startTime,
          timeLabel: formatTimeRange(time),
          watchedCount,
          totalCount: c.lectures.length,
        });
      }
    }
  }
  lectureRows.sort(
    (a, b) =>
      a.scheduledDate.getTime() - b.scheduledDate.getTime() ||
      // Same day: earlier lecture first, lectures with no time last.
      (a.startTime ? timeToMinutes(a.startTime) : Infinity) -
        (b.startTime ? timeToMinutes(b.startTime) : Infinity)
  );

  // Same rows already computed above, just reshaped for the week-grid view
  // below — no extra query. Overdue homework (due before weekStart) is
  // intentionally excluded here; it's already surfaced in the list above.
  const calendarItems: WeekCalendarItem[] = [
    ...dueRows
      .filter((r) => r.dueDate >= weekStart)
      .map((r) => ({
        id: r.homeworkId,
        type: "homework" as const,
        date: r.dueDate,
        courseName: r.courseName,
        label: r.name,
        href: `/courses/${r.courseId}`,
        color: r.courseColor,
      })),
    ...lectureRows.map((l) => ({
      id: l.lectureId,
      type: "lecture" as const,
      date: l.scheduledDate,
      courseName: l.courseName,
      label: l.title || t(lang, "lectureNumber", l.number),
      time: l.startTime,
      href: `/courses/${l.courseId}`,
      color: l.courseColor,
    })),
  ];

  const headline =
    dueRows.length === 0
      ? t(lang, "nothingDueThisWeek")
      : overdueCount > 0
        ? t(lang, "overdueCount", overdueCount)
        : t(lang, "dueCount", dueRows.length);

  return (
    <div className="animate-in" style={{ paddingTop: 52 }}>
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
          {t(lang, "weekOf", `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`)}
        </div>
        <h1 style={{ fontSize: "clamp(38px,6vw,56px)", margin: "0 0 12px" }}>{headline}</h1>
        <p style={{ fontSize: 16, color: "var(--color-neutral-600)", margin: 0 }}>
          {active
            ? `${active.name} · ${formatDate(active.startDate)} – ${formatDate(active.endDate)}`
            : t(lang, "noSemesterInProgress")}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 40,
          marginTop: 42,
        }}
      >
        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>{t(lang, "dueThisWeek")}</h2>
          <p style={{ fontSize: "12.5px", color: "var(--color-neutral-600)", margin: "0 0 20px" }}>
            {overdueCount > 0 ? t(lang, "overdueFirst") : t(lang, "byEndOfWeek")}
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
              {t(lang, "emptyDue")}
            </p>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>{t(lang, "lecturesThisWeek")}</h2>
          <p style={{ fontSize: "12.5px", color: "var(--color-neutral-600)", margin: "0 0 20px" }}>
            {active
              ? t(lang, "scheduledBetween", `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`)
              : "—"}
          </p>
          <WeekLectures rows={lectureRows} lang={lang} now={now} />
          {lectureRows.length === 0 && (
            <p style={{ fontSize: 14, color: "var(--color-neutral-600)", fontStyle: "italic" }}>
              {active ? t(lang, "emptyLectures") : t(lang, "noSemesterInProgress")}
            </p>
          )}
        </section>
      </div>

      <WeekCalendar weekStart={weekStart} items={calendarItems} lang={lang} />
    </div>
  );
}
