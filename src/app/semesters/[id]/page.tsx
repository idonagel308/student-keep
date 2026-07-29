import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createCourse, updateCourse, deleteCourse } from "@/app/actions/courses";
import { updateSemester, deleteSemester } from "@/app/actions/semesters";
import { CourseForm } from "@/components/forms/CourseForm";
import { SemesterForm } from "@/components/forms/SemesterForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ProgressBar } from "@/components/ProgressBar";
import { courseProgress } from "@/lib/progress";
import { formatDate, formatDateInput } from "@/lib/format";
import { cardClass, btnSecondary } from "@/components/ui";
import { requireUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function SemesterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const semester = await prisma.semester.findFirst({
    where: { id, userId: user.id },
    include: {
      courses: {
        orderBy: { createdAt: "asc" },
        include: { lectures: true, homework: true },
      },
    },
  });

  if (!semester) notFound();

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/"
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← All semesters
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{semester.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SemesterForm
            action={updateSemester}
            title="Edit semester"
            triggerLabel="Edit"
            triggerClassName={btnSecondary}
            initial={{
              id: semester.id,
              name: semester.name,
              startDate: formatDateInput(semester.startDate),
              endDate: formatDateInput(semester.endDate),
            }}
          />
          <DeleteButton
            action={deleteSemester}
            hidden={{ id: semester.id }}
            confirmMessage="Delete this semester and all its courses? This cannot be undone."
          />
          <CourseForm
            action={createCourse}
            semesterId={semester.id}
            title="Add course"
            triggerLabel="+ Add course"
          />
        </div>
      </div>

      {semester.courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
          No courses yet. Add your first course.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {semester.courses.map((c) => {
            const p = courseProgress(c);
            return (
              <div key={c.id} className={cardClass + " relative"}>
                <Link href={`/courses/${c.id}`} className="block">
                  <div className="flex items-center gap-2">
                    {c.color && (
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                    )}
                    <h2 className="text-lg font-semibold">{c.name}</h2>
                  </div>
                  {c.credits != null && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {c.credits} credits
                    </p>
                  )}
                  <div className="mt-3 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Lectures</span>
                        <span>
                          {p.watched}/{p.totalLectures}
                        </span>
                      </div>
                      <ProgressBar
                        value={p.watched}
                        total={p.totalLectures}
                        className="mt-1"
                        color={c.color ?? undefined}
                      />
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Homework: {p.doneHw}/{p.totalHw} done
                    </p>
                  </div>
                </Link>
                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <CourseForm
                    action={updateCourse}
                    semesterId={semester.id}
                    title="Edit course"
                    triggerLabel="Edit"
                    triggerClassName="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    initial={{
                      id: c.id,
                      name: c.name,
                      totalLectures: c.totalLectures,
                      credits: c.credits,
                      color: c.color,
                    }}
                  />
                  <DeleteButton
                    action={deleteCourse}
                    hidden={{ id: c.id, semesterId: semester.id }}
                    label="Delete"
                    className="text-sm text-red-500 hover:text-red-700"
                    confirmMessage="Delete this course and all its lectures and homework?"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
