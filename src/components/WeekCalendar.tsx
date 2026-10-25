"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import { buildWeekDays, type WeekCalendarItem } from "@/lib/weekCalendar";

// weekStart passed in from page.tsx is always the Sunday of the current
// week (date-fns startOfWeek(now, { weekStartsOn: 0 })) - this order must
// match that or every label is off by however many days the two
// conventions disagree by.
const DAY_KEYS = ["daySun", "dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat"] as const;

const VISIBLE_ITEMS_PER_DAY = 2;

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Each line picks its own text direction (dir="auto") so an English course
// name inside the Hebrew UI, or the reverse, is cut off at its real end
// rather than its start. The Link is a column flexbox that pins each
// shrink-wrapped line to the layout's start edge, so lines still line up.
const ellipsis = {
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

function ItemChip({ item, extra }: { item: WeekCalendarItem; extra: boolean }) {
  const isLecture = item.type === "lecture";
  return (
    <Link
      href={item.href}
      className={extra ? "week-chip-extra" : undefined}
      title={[item.time, item.courseName, item.label].filter(Boolean).join(" · ")}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        fontSize: 10.5,
        lineHeight: 1.3,
        padding: "3px 6px",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        background: isLecture ? "var(--color-accent-100)" : "var(--color-accent-2-100)",
        color: isLecture ? "var(--color-accent-800)" : "var(--color-accent-2-800)",
        // The stripe is the course's color, so chips from the same course
        // read as a group at a glance.
        borderInlineStart: `3px solid ${item.color ?? "var(--color-accent)"}`,
      }}
    >
      <span dir="auto" style={{ ...ellipsis, fontWeight: 600 }}>
        {item.time && (
          <>
            <span dir="ltr">{item.time}</span>{" "}
          </>
        )}
        {item.courseName}
      </span>
      <span dir="auto" style={{ ...ellipsis, opacity: 0.85 }}>
        {item.label}
      </span>
    </Link>
  );
}

export function WeekCalendar({
  weekStart,
  items,
  lang,
}: {
  weekStart: Date;
  items: WeekCalendarItem[];
  lang: Lang;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const days = buildWeekDays(weekStart, items);
  const today = new Date();

  return (
    <section style={{ marginTop: 48 }}>
      <h2 style={{ fontSize: 24, margin: "0 0 20px" }}>{t(lang, "weekAtAGlance")}</h2>
      <div className="week-grid">
        {days.map((day, i) => {
          const isToday = sameCalendarDay(day.date, today);
          const isExpanded = expanded === i;
          const hiddenCount = isExpanded ? 0 : Math.max(0, day.items.length - VISIBLE_ITEMS_PER_DAY);

          return (
            <div
              key={i}
              className="week-day"
              // Collapsing is CSS-only: every chip is rendered, and the extras
              // are hidden on wide screens until "+N more" is pressed. Phones
              // show the whole day, so nothing is ever tucked away there.
              data-collapsed={!isExpanded}
              style={{
                background: "var(--color-surface)",
                borderRadius: "var(--radius-md)",
                padding: "8px 6px",
                minHeight: 90,
                display: "flex",
                flexDirection: "column",
                gap: 5,
                boxShadow: isToday ? "inset 0 0 0 1.5px var(--color-accent)" : undefined,
              }}
            >
              <div className="week-day-head">
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--color-neutral-600)",
                  }}
                >
                  {t(lang, DAY_KEYS[i])}
                </div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{format(day.date, "d")}</div>
              </div>
              {day.items.map((item, idx) => (
                <ItemChip
                  key={`${item.type}-${item.id}`}
                  item={item}
                  extra={idx >= VISIBLE_ITEMS_PER_DAY}
                />
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="week-more"
                  onClick={() => setExpanded(i)}
                  style={{
                    all: "unset",
                    cursor: "pointer",
                    fontSize: 10.5,
                    color: "var(--color-accent)",
                    padding: "2px 6px",
                  }}
                >
                  {t(lang, "moreCount", hiddenCount)}
                </button>
              )}
              {day.items.length === 0 && (
                <span style={{ fontSize: 10, color: "var(--color-neutral-500)", fontStyle: "italic" }}>
                  {t(lang, "emptyDay")}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
