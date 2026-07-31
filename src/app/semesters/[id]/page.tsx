import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createCourse, updateCourse, deleteCourse } from "@/app/actions/courses";
import { updateSemester, deleteSemester } from "@/app/actions/semesters";
import { CourseForm } from "@/components/forms/CourseForm";
import { SemesterForm } from "@/components/forms/SemesterForm";
import { DeleteButton } from "@/components/DeleteButton";
import { ProgressBar } from "@/components/ProgressBar";
import { EditIcon, DeleteIcon, PlusIcon } from "@/components/icons";
import { courseProgress } from "@/lib/progress";
import { formatDate, formatDateInput } from "@/lib/format";
import { requireUser } from "@/lib/dal";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";

export const dynamic = "force-dynamic";

export default async function SemesterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const lang = await getLang();
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

  const now = new Date();
  const isActive = semester.startDate <= now && semester.endDate >= now;
  const allLectures = semester.courses.flatMap((c) => c.lectures);
  const totalLectures = allLectures.length;
  const watchedLectures = allLectures.filter((l) => l.watched).length;
  const dueLectures = allLectures.filter((l) => l.scheduledDate && l.scheduledDate <= now).length;
  const diff = watchedLectures - dueLectures;
  const elapsed =
    semester.endDate > semester.startDate
      ? Math.max(
          0,
          Math.min(1, (now.getTime() - semester.startDate.getTime()) / (semester.endDate.getTime() - semester.startDate.getTime()))
        )
      : 0;
  const showPace = isActive && totalLectures > 0;
  const paceNote =
    diff === 0 ? t(lang, "onTrack") : diff > 0 ? t(lang, "aheadBy", diff) : t(lang, "behindBy", -diff);

  return (
    <div className="animate-in" style={{ paddingTop: 48 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/semesters" style={{ fontSize: 13 }}>
          <span className="back-arrow">←</span> {t(lang, "semesters")}
        </Link>
      </div>

      {showPace && (
        <div style={{ marginBottom: 34, maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginBottom: 9 }}>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--color-accent)",
              }}
            >
              {t(lang, "pace")}
            </span>
            <span style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", fontFeatureSettings: "'tnum' 1" }}>
              {t(lang, "semesterElapsed", Math.round(elapsed * 100))}
            </span>
          </div>
          <div style={{ position: "relative", height: 10, borderRadius: 99, background: "var(--color-neutral-300)", overflow: "visible" }}>
            <div
              style={{
                width: `${totalLectures ? (watchedLectures / totalLectures) * 100 : 0}%`,
                height: "100%",
                background: diff < 0 ? "var(--color-accent-2)" : "var(--color-accent)",
                borderRadius: 99,
                transition: "width .7s cubic-bezier(.2,.8,.3,1), background .3s ease",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -5,
                bottom: -5,
                insetInlineStart: `${totalLectures ? (dueLectures / totalLectures) * 100 : 0}%`,
                width: 2,
                background: "var(--color-text)",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, marginTop: 9 }}>
            <span style={{ fontSize: 13, color: diff < 0 ? "var(--color-accent-2)" : "var(--color-neutral-700)" }}>
              {paceNote}
            </span>
            <span style={{ fontSize: "11.5px", color: "var(--color-neutral-500)", fontFeatureSettings: "'tnum' 1" }}>
              {t(lang, "lectureCount", watchedLectures, totalLectures)} · {t(lang, "expectedBy", dueLectures)}
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 34,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-accent)",
              marginBottom: 8,
            }}
          >
            {t(lang, "semesterKicker")}
          </div>
          <h1 style={{ fontSize: "clamp(30px,5vw,44px)", margin: "0 0 6px" }}>
            {semester.name}
          </h1>
          <p style={{ fontSize: 14, color: "var(--color-neutral-600)", margin: 0 }}>
            {formatDate(semester.startDate)} – {formatDate(semester.endDate)}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <SemesterForm
            action={updateSemester}
            title={t(lang, "editSemester")}
            triggerLabel={t(lang, "edit")}
            triggerClassName="btn btn-secondary"
            lang={lang}
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
            label={t(lang, "delete")}
            confirmMessage={t(lang, "deleteSemesterConfirm")}
            className="btn btn-ghost-danger"
          />
        </div>
      </div>

      {semester.courses.length === 0 && (
        <p style={{ fontSize: 14, color: "var(--color-neutral-600)", fontStyle: "italic" }}>
          {t(lang, "noCoursesYet")}
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 22,
        }}
      >
        {semester.courses.map((c) => {
            const p = courseProgress(c);
            return (
              <div key={c.id} className="card elev-sm card-link" style={{ padding: 20, gap: 16 }}>
                <Link href={`/courses/${c.id}`} style={{ display: "block" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 5,
                    }}
                  >
                    {c.color && (
                      <span
                        style={{
                          height: 10,
                          width: 10,
                          flexShrink: 0,
                          borderRadius: 999,
                          backgroundColor: c.color,
                        }}
                      />
                    )}
                    <span style={{ fontWeight: 600, fontSize: 19 }}>{c.name}</span>
                    {c.courseNumber && (
                      <span style={{ fontSize: 12, color: "var(--color-neutral-600)" }}>
                        {c.courseNumber}
                      </span>
                    )}
                  </div>
                  {c.credits != null && (
                    <p style={{ fontSize: 12, color: "var(--color-neutral-600)", margin: "0 0 12px" }}>
                      {t(lang, "creditsCount", c.credits)}
                    </p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "var(--color-neutral-600)",
                          marginBottom: 6,
                          fontFeatureSettings: "'tnum' 1",
                        }}
                      >
                        <span>{t(lang, "lecturesLabel")}</span>
                        <span>
                          {p.watched}/{p.totalLectures}
                        </span>
                      </div>
                      <ProgressBar
                        value={p.watched}
                        total={p.totalLectures}
                        color={c.color ?? undefined}
                      />
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-neutral-700)", margin: 0 }}>
                      {t(lang, "homeworkDone", p.doneHw, p.totalHw)}
                    </p>
                  </div>
                </Link>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    justifyContent: "flex-end",
                    paddingTop: 12,
                    borderTop: "1px solid var(--color-divider)",
                  }}
                >
                  <CourseForm
                    action={updateCourse}
                    semesterId={semester.id}
                    title={t(lang, "editCourseTitle")}
                    triggerLabel={<EditIcon />}
                    triggerClassName="btn btn-icon btn-ghost"
                    triggerAriaLabel={`${t(lang, "edit")} ${c.name}`}
                    lang={lang}
                    initial={{
                      id: c.id,
                      name: c.name,
                      courseNumber: c.courseNumber,
                      totalLectures: c.totalLectures,
                      credits: c.credits,
                      color: c.color,
                      dayOfWeek: c.dayOfWeek,
                    }}
                  />
                  <DeleteButton
                    action={deleteCourse}
                    hidden={{ id: c.id, semesterId: semester.id }}
                    label={<DeleteIcon />}
                    ariaLabel={`${t(lang, "delete")} ${c.name}`}
                    className="btn btn-icon btn-ghost-danger"
                    confirmMessage={t(lang, "deleteCourseConfirm")}
                  />
                </div>
              </div>
            );
        })}
        <CourseForm
          action={createCourse}
          semesterId={semester.id}
          title={t(lang, "addCourse")}
          triggerClassName="card-dashed"
          lang={lang}
          triggerLabel={
            <>
              <PlusIcon />
              <span style={{ display: "block", fontWeight: 600, fontSize: 17, marginTop: 8 }}>
                {t(lang, "addCourse")}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--color-neutral-600)" }}>
                {t(lang, "addCourseSub")}
              </span>
            </>
          }
        />
      </div>
    </div>
  );
}
