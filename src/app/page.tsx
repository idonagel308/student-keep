import Link from "next/link";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toggleHomework } from "@/app/actions/homework";
import { toggleLecture } from "@/app/actions/lectures";
import { CheckIcon } from "@/components/icons";
import { formatDate, dueLabel, dueStatus } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";
import { WeekCalendar } from "@/components/WeekCalendar";
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

type LectureRow = {
  courseId: string;
  courseName: string;
  courseColor: string | null;
  lectureId: string;
  number: number;
  title: string | null;
  watched: boolean;
  scheduledDate: Date;
  watchedCount: number;
  totalCount: number;
};

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
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

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
        lectureRows.push({
          courseId: c.id,
          courseName: c.name,
          courseColor: c.color,
          lectureId: l.id,
          number: l.number,
          title: l.title,
          watched: l.watched,
          scheduledDate: l.scheduledDate,
          watchedCount,
          totalCount: c.lectures.length,
        });
      }
    }
  }
  lectureRows.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());

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
        label: r.name,
        href: `/courses/${r.courseId}`,
        color: r.courseColor,
      })),
    ...lectureRows.map((l) => ({
      id: l.lectureId,
      type: "lecture" as const,
      date: l.scheduledDate,
      label: l.title || t(lang, "lectureNumber", l.number),
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
            {overdueCount > 0 ? t(lang, "overdueFirst") : t(lang, "bySunday")}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {lectureRows.map((l) => (
              <div
                key={l.lectureId}
                style={{ padding: "12px 10px", margin: "0 -10px", borderRadius: "var(--radius-md)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <form action={toggleLecture as (fd: FormData) => void}>
                    <input type="hidden" name="id" value={l.lectureId} />
                    <input type="hidden" name="courseId" value={l.courseId} />
                    <button
                      type="submit"
                      className="check-box"
                      aria-pressed={l.watched}
                      aria-label={`${l.watched ? t(lang, "markUnwatched") : t(lang, "markWatched")}: ${l.title ?? t(lang, "lectureNumber", l.number)}`}
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
                    <span style={{ display: "block", fontSize: "14.5px", marginTop: 4 }}>
                      {l.title || t(lang, "lectureNumber", l.number)}
                    </span>
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
            ))}
          </div>
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
