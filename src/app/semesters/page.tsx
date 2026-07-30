import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createSemester, updateSemester, deleteSemester } from "@/app/actions/semesters";
import { SemesterForm } from "@/components/forms/SemesterForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressRing } from "@/components/ProgressRing";
import { EditIcon, DeleteIcon, PlusIcon } from "@/components/icons";
import { semesterProgress, type CourseWithChildren } from "@/lib/progress";
import { formatDate, formatDateInput } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import type { Semester } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type SemesterWithCourses = Semester & { courses: CourseWithChildren[] };

function SemesterCard({ s }: { s: SemesterWithCourses }) {
  const p = semesterProgress(s.courses);
  return (
    <div className="card elev-sm card-link" style={{ padding: 20, gap: 16 }}>
      <Link href={`/semesters/${s.id}`} style={{ display: "block" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
                marginBottom: 6,
              }}
            >
              Semester
            </div>
            <div style={{ fontWeight: 600, fontSize: 22, lineHeight: 1.1 }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "var(--color-neutral-600)", marginTop: 5 }}>
              {formatDate(s.startDate)} – {formatDate(s.endDate)}
            </div>
          </div>
          <ProgressRing pct={p.lecturePct} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontSize: 12,
            color: "var(--color-neutral-600)",
            marginTop: 14,
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          <span>
            {p.courseCount} {p.courseCount === 1 ? "course" : "courses"}
          </span>
          <span>
            {p.watched}/{p.totalLectures} lectures
          </span>
        </div>
        <ProgressBar value={p.watched} total={p.totalLectures} className="mt-2" />
      </Link>
      <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
        <SemesterForm
          action={updateSemester}
          title="Edit semester"
          triggerLabel={<EditIcon />}
          triggerClassName="btn btn-icon btn-ghost"
          triggerAriaLabel={`Edit ${s.name}`}
          initial={{
            id: s.id,
            name: s.name,
            startDate: formatDateInput(s.startDate),
            endDate: formatDateInput(s.endDate),
          }}
        />
        <DeleteButton
          action={deleteSemester}
          hidden={{ id: s.id }}
          label={<DeleteIcon />}
          ariaLabel={`Delete ${s.name}`}
          className="btn btn-icon btn-ghost-danger"
          confirmMessage="Delete this semester and all its courses? This cannot be undone."
        />
      </div>
    </div>
  );
}

export default async function SemestersPage() {
  const user = await requireUser();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      courses: { include: { lectures: true, homework: true } },
    },
  });

  const now = new Date();
  const phase = (s: SemesterWithCourses) => {
    if (s.startDate > now) return "planned" as const;
    if (s.endDate < now) return "complete" as const;
    return "active" as const;
  };

  const groups = (["active", "planned", "complete"] as const).map((key) => {
    const list = semesters.filter((s) => phase(s) === key);
    list.sort((a, b) =>
      key === "complete"
        ? b.startDate.getTime() - a.startDate.getTime()
        : a.startDate.getTime() - b.startDate.getTime()
    );
    return { key, list };
  });

  const labels = { active: "In progress", planned: "Planned", complete: "Completed" };

  return (
    <div className="animate-in" style={{ paddingTop: 52 }}>
      <div style={{ maxWidth: 640 }}>
        <h1 style={{ fontSize: "clamp(34px,6vw,48px)", margin: "0 0 10px" }}>Semesters</h1>
        <p style={{ fontSize: 16, color: "var(--color-neutral-600)", margin: 0 }}>
          {semesters.length} {semesters.length === 1 ? "semester" : "semesters"} tracked
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 48, marginTop: 44 }}>
        {groups.map((g) => {
          if (g.list.length === 0 && g.key !== "active") return null;
          return (
            <section key={g.key}>
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 20 }}>
                <span
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: g.key === "active" ? "var(--color-accent)" : "var(--color-neutral-600)",
                  }}
                >
                  {labels[g.key]}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-neutral-500)", fontFeatureSettings: "'tnum' 1" }}>
                  {g.list.length}
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(272px, 1fr))",
                  gap: 22,
                }}
              >
                {g.list.map((s) => (
                  <SemesterCard key={s.id} s={s} />
                ))}
                {g.key === "active" && (
                  <SemesterForm
                    action={createSemester}
                    title="Add semester"
                    triggerClassName="card-dashed"
                    triggerLabel={
                      <>
                        <PlusIcon />
                        <span style={{ display: "block", fontWeight: 600, fontSize: 17, marginTop: 8 }}>
                          Add semester
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--color-neutral-600)" }}>
                          Start tracking a new term
                        </span>
                      </>
                    }
                  />
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
