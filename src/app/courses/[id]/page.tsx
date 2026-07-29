import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createHomework } from "@/app/actions/homework";
import { updateCourse, deleteCourse } from "@/app/actions/courses";
import { HomeworkForm } from "@/components/forms/HomeworkForm";
import { HomeworkItem } from "@/components/HomeworkItem";
import { LectureRow } from "@/components/LectureRow";
import { CourseForm } from "@/components/forms/CourseForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDate, dueLabel, dueStatus } from "@/lib/format";
import { btnSecondary } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      lectures: { orderBy: { number: "asc" } },
      homework: true,
      semester: true,
    },
  });

  if (!course) notFound();

  const watched = course.lectures.filter((l) => l.watched).length;
  const totalLectures = course.lectures.length;

  const doneHw = course.homework.filter((h) => h.completed).length;
  const totalHw = course.homework.length;

  // Homework sorted: incomplete-with-due-date soonest first, then no-due, then completed.
  const homeworkSorted = [...course.homework].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.dueDate && b.dueDate)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const upcoming = course.homework
    .filter((h) => !h.completed && h.dueDate)
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    )
    .slice(0, 5);

  const dueStyles: Record<string, string> = {
    overdue: "text-red-600 dark:text-red-400",
    today: "text-amber-600 dark:text-amber-400",
    upcoming: "text-slate-600 dark:text-slate-300",
  };

  return (
    <div>
      <div className="mb-2">
        <Link
          href={`/semesters/${course.semesterId}`}
          className="text-sm text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← {course.semester.name}
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {course.color && (
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: course.color }}
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{course.name}</h1>
            {course.credits != null && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {course.credits} credits
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CourseForm
            action={updateCourse}
            semesterId={course.semesterId}
            title="Edit course"
            triggerLabel="Edit"
            triggerClassName={btnSecondary}
            initial={{
              id: course.id,
              name: course.name,
              totalLectures: course.totalLectures,
              credits: course.credits,
              color: course.color,
            }}
          />
          <DeleteButton
            action={deleteCourse}
            hidden={{ id: course.id, semesterId: course.semesterId }}
            confirmMessage="Delete this course and all its lectures and homework?"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Lectures */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lectures</h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {watched} / {totalLectures} watched
            </span>
          </div>
          <ProgressBar
            value={watched}
            total={totalLectures}
            color={course.color ?? undefined}
            className="mb-4"
          />
          {course.lectures.length === 0 ? (
            <p className="text-sm text-slate-500">
              No lectures. Edit the course to set a lecture count.
            </p>
          ) : (
            <ul>
              {course.lectures.map((l) => (
                <LectureRow key={l.id} lecture={l} />
              ))}
            </ul>
          )}
        </section>

        {/* Homework */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Homework</h2>
            <HomeworkForm
              action={createHomework}
              courseId={course.id}
              title="Add homework"
              triggerLabel="+ Add"
            />
          </div>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              {doneHw} / {totalHw} completed
            </span>
          </div>
          <ProgressBar value={doneHw} total={totalHw} className="mb-4" />

          {upcoming.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Upcoming due dates
              </p>
              <ul className="space-y-1">
                {upcoming.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="truncate">{h.name}</span>
                    <span
                      className={`shrink-0 text-xs ${dueStyles[dueStatus(h.dueDate!)]}`}
                    >
                      {formatDate(h.dueDate)} · {dueLabel(h.dueDate!)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.homework.length === 0 ? (
            <p className="text-sm text-slate-500">No homework yet.</p>
          ) : (
            <ul className="space-y-3">
              {homeworkSorted.map((h) => (
                <HomeworkItem key={h.id} hw={h} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
