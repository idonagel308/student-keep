import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { gpaStats } from "@/lib/progress";
import { requireUser } from "@/lib/dal";
import { DegreeCourseList } from "@/components/DegreeCourseList";

export const dynamic = "force-dynamic";

function num(n: number) {
  return Number(n.toFixed(1)).toString();
}

function semesterStatus(start: Date, end: Date, now: Date) {
  if (start > now) return "Planned";
  if (end < now) return "Completed";
  return "In progress";
}

export default async function DegreePage() {
  const user = await requireUser();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: { courses: true },
  });

  const now = new Date();
  const allCourses = semesters.flatMap((s) => s.courses);
  const stats = gpaStats(allCourses);
  const required = user.creditsRequired ?? 120;
  const left = Math.max(0, required - stats.earned);
  const pct = required > 0 ? Math.min(1, stats.earned / required) : 0;

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
          {user.degreeName ?? "Degree overview"}
        </div>
        <h1 style={{ fontSize: "clamp(38px,6vw,56px)", margin: "0 0 12px" }}>
          {num(stats.earned)} of {num(required)} credits earned
        </h1>
        <p style={{ fontSize: 16, color: "var(--color-neutral-600)", margin: 0 }}>
          {left > 0 ? `${num(left)} credits still to earn.` : "Degree complete — every credit is in."}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap", marginTop: 38 }}>
        <div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--color-neutral-600)",
              marginBottom: 8,
            }}
          >
            Average
          </div>
          <div style={{ fontSize: "clamp(48px,8vw,72px)", fontWeight: 600, lineHeight: 0.9, fontFeatureSettings: "'tnum' 1" }}>
            {stats.avg === null ? "—" : num(stats.avg)}
          </div>
          <div style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", marginTop: 10, maxWidth: "24ch", lineHeight: 1.5 }}>
            Weighted by credits across every graded course.
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
              color: "var(--color-neutral-600)",
              marginBottom: 7,
              fontFeatureSettings: "'tnum' 1",
            }}
          >
            <span>Credits earned {num(stats.earned)}</span>
            <span>{Math.round(pct * 100)}%</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: "var(--color-neutral-300)", overflow: "hidden" }}>
            <div
              style={{
                width: `${pct * 100}%`,
                height: "100%",
                background: "var(--color-accent)",
                borderRadius: 99,
                transition: "width .7s cubic-bezier(.2,.8,.3,1)",
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: "var(--color-neutral-600)", marginTop: 7, fontFeatureSettings: "'tnum' 1" }}>
            Credits left {num(left)}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 40,
          marginTop: 46,
        }}
      >
        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 20px" }}>By semester</h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {semesters.map((s) => {
              const sk = gpaStats(s.courses);
              return (
                <Link
                  key={s.id}
                  href={`/semesters/${s.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 10px",
                    margin: "0 -10px",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15 }}>{s.name}</div>
                    <div style={{ fontSize: "11.5px", color: "var(--color-neutral-600)", marginTop: 3 }}>
                      {semesterStatus(s.startDate, s.endDate, now)} · {num(sk.credits)} credits
                    </div>
                  </div>
                  <span
                    style={{
                      flex: "none",
                      fontSize: 12,
                      padding: "3px 9px",
                      borderRadius: "var(--radius-md)",
                      fontFeatureSettings: "'tnum' 1",
                      color: sk.avg === null ? "var(--color-neutral-500)" : undefined,
                      background: sk.avg !== null ? (sk.avg >= 60 ? "var(--color-accent-100)" : "var(--color-accent-2-100)") : undefined,
                      ...(sk.avg !== null
                        ? { color: sk.avg >= 60 ? "var(--color-accent-800)" : "var(--color-accent-2-800)" }
                        : {}),
                    }}
                  >
                    {sk.avg === null ? "—" : num(sk.avg)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 24, margin: "0 0 16px" }}>Graded courses</h2>
          <DegreeCourseList
            courses={allCourses.map((c) => {
              const semester = semesters.find((s) => s.id === c.semesterId)!;
              return {
                id: c.id,
                name: c.name,
                semesterName: semester.name,
                color: c.color,
                credits: c.credits,
                examScore: c.examScore,
              };
            })}
          />
        </section>
      </div>
    </div>
  );
}
