import Link from "next/link";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { toggleHomework } from "@/app/actions/homework";
import { toggleLecture } from "@/app/actions/lectures";
import { CheckIcon } from "@/components/icons";
import { formatDate, dueLabel, dueStatus } from "@/lib/format";
import { requireUser } from "@/lib/dal";

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

  const headline =
    dueRows.length === 0
      ? "Nothing due this week."
      : overdueCount > 0
        ? `${overdueCount} ${overdueCount === 1 ? "thing is" : "things are"} overdue`
        : `${dueRows.length} ${dueRows.length === 1 ? "thing due" : "things due"} this week`;

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
          Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
        </div>
        <h1 style={{ fontSize: "clamp(38px,6vw,56px)", margin: "0 0 12px" }}>{headline}</h1>
        <p style={{ fontSize: 16, color: "var(--color-neutral-600)", margin: 0 }}>
          {active
            ? `${active.name} · ${formatDate(active.startDate)} – ${formatDate(active.endDate)}`
            : "No semester in progress."}
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
          <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>Due this week</h2>
          <p style={{ fontSize: "12.5px", color: "var(--color-neutral-600)", margin: "0 0 20px" }}>
            {overdueCount > 0 ? "Overdue first, then the rest of the week." : "Everything landing by Sunday."}
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
                  <button type="submit" className="check-box" aria-label={`Mark done: ${r.name}`}>
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
              Nothing due before Sunday.
            </p>
          )}
        </section>

        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 4px" }}>Lectures this week</h2>
          <p style={{ fontSize: "12.5px", color: "var(--color-neutral-600)", margin: "0 0 20px" }}>
            {active ? `Scheduled between ${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}.` : "—"}
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
                      aria-label={
                        l.watched
                          ? `Mark unwatched: ${l.title ?? "Lecture " + l.number}`
                          : `Mark watched: ${l.title ?? "Lecture " + l.number}`
                      }
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
                      {l.title || `Lecture ${l.number}`}
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
              {active ? "No lectures scheduled this week." : "No semester in progress."}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
