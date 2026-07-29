import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createSemester } from "@/app/actions/semesters";
import { SemesterForm } from "@/components/forms/SemesterForm";
import { ProgressBar } from "@/components/ProgressBar";
import { semesterProgress } from "@/lib/progress";
import { formatDate } from "@/lib/format";
import { cardClass } from "@/components/ui";
import { requireUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireUser();
  const semesters = await prisma.semester.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" },
    include: {
      courses: { include: { lectures: true, homework: true } },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Semesters</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {semesters.length}{" "}
            {semesters.length === 1 ? "semester" : "semesters"}
          </p>
        </div>
        <SemesterForm
          action={createSemester}
          triggerLabel="+ Add semester"
          title="Add semester"
        />
      </div>

      {semesters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
          No semesters yet. Add your first one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {semesters.map((s) => {
            const p = semesterProgress(s.courses);
            return (
              <Link key={s.id} href={`/semesters/${s.id}`} className={cardClass}>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{s.name}</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(s.startDate)} – {formatDate(s.endDate)}
                </p>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  {p.courseCount} {p.courseCount === 1 ? "course" : "courses"},{" "}
                  {p.lecturePct}% lectures done
                </p>
                <ProgressBar
                  value={p.watched}
                  total={p.totalLectures}
                  className="mt-2"
                />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
