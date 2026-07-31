import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createHomework } from "@/app/actions/homework";
import { updateCourse, deleteCourse } from "@/app/actions/courses";
import { HomeworkForm } from "@/components/forms/HomeworkForm";
import { HomeworkItem } from "@/components/HomeworkItem";
import { LectureRow } from "@/components/LectureRow";
import { ScheduleWeeklyButton } from "@/components/ScheduleWeeklyButton";
import { CourseForm } from "@/components/forms/CourseForm";
import { CourseGrade } from "@/components/forms/CourseGrade";
import { DeleteButton } from "@/components/DeleteButton";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressRing } from "@/components/ProgressRing";
import { formatDate, dueLabel, dueStatus } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";

export const dynamic = "force-dynamic";

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang();
  const course = await prisma.course.findFirst({
    where: { id, semester: { userId: user.id } },
    include: {
      lectures: { orderBy: { number: "asc" } },
      homework: true,
      semester: true,
    },
  });

  if (!course) notFound();

  const watched = course.lectures.filter((l) => l.watched).length;
  const totalLectures = course.lectures.length;
  const lecturePct = totalLectures > 0 ? Math.round((watched / totalLectures) * 100) : 0;

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

  const dueColors: Record<string, string> = {
    overdue: "var(--color-accent-2)",
    today: "var(--color-accent-700)",
    upcoming: "var(--color-neutral-600)",
  };

  return (
    <div className="animate-in" style={{ paddingTop: 48 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href={`/semesters/${course.semesterId}`} style={{ fontSize: 13 }}>
          <span className="back-arrow">←</span> {course.semester.name}
        </Link>
      </div>

      <div style={{ maxWidth: 720 }}>
        {course.color && (
          <div
            style={{
              height: 4,
              width: 44,
              borderRadius: 99,
              background: course.color,
              marginBottom: 10,
            }}
          />
        )}
        <h1 style={{ fontSize: "clamp(30px,5vw,44px)", margin: "0 0 8px" }}>{course.name}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {course.credits != null && (
            <p style={{ fontSize: 14, color: "var(--color-neutral-600)", margin: 0 }}>
              {t(lang, "creditsCount", course.credits)}
            </p>
          )}
          <CourseForm
            action={updateCourse}
            semesterId={course.semesterId}
            title={t(lang, "editCourseTitle")}
            triggerLabel={t(lang, "edit")}
            triggerClassName="btn btn-ghost"
            lang={lang}
            initial={{
              id: course.id,
              name: course.name,
              totalLectures: course.totalLectures,
              credits: course.credits,
              color: course.color,
              dayOfWeek: course.dayOfWeek,
            }}
          />
          <DeleteButton
            action={deleteCourse}
            hidden={{ id: course.id, semesterId: course.semesterId }}
            label={t(lang, "delete")}
            className="btn btn-ghost-danger"
            confirmMessage={t(lang, "deleteCourseConfirm")}
          />
        </div>
        <CourseGrade courseId={course.id} examScore={course.examScore} lang={lang} />
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
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
            <ProgressRing pct={lecturePct} size={72} stroke={5} color={course.color ?? undefined} labelSize={16} />
            <div>
              <h2 style={{ fontSize: 22, margin: "0 0 4px", fontFeatureSettings: "'tnum' 1" }}>
                {t(lang, "lecturesWatched", watched, totalLectures)}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-neutral-600)" }}>
                {t(lang, "trackCaughtUp")}
              </p>
            </div>
          </div>

          {course.lectures.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>
              {t(lang, "noLecturesYet")}
            </p>
          ) : (
            <>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {course.lectures.map((l) => (
                  <LectureRow key={l.id} lecture={l} lang={lang} />
                ))}
              </ul>
              <div style={{ marginTop: 12 }}>
                <ScheduleWeeklyButton courseId={course.id} lang={lang} />
              </div>
            </>
          )}
        </section>

        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <h2 style={{ fontSize: 22, margin: 0, fontFeatureSettings: "'tnum' 1" }}>
              {t(lang, "homeworkDone", doneHw, totalHw)}
            </h2>
            <HomeworkForm
              action={createHomework}
              courseId={course.id}
              title={t(lang, "addHomework")}
              triggerLabel={t(lang, "addShort")}
              lang={lang}
            />
          </div>
          <ProgressBar value={doneHw} total={totalHw} className="mb-4" />

          {upcoming.length > 0 && (
            <div
              className="card"
              style={{ marginTop: 14, marginBottom: 18, gap: 8, padding: 14 }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-accent)",
                  margin: 0,
                }}
              >
                {t(lang, "upcomingDueDates")}
              </p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {upcoming.map((h) => (
                  <li
                    key={h.id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.name}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 11, color: dueColors[dueStatus(h.dueDate!)] }}>
                      {formatDate(h.dueDate)} · {dueLabel(h.dueDate!)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {course.homework.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--color-neutral-600)" }}>{t(lang, "noHomeworkYet")}</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {homeworkSorted.map((h) => (
                <HomeworkItem key={h.id} hw={h} lang={lang} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
