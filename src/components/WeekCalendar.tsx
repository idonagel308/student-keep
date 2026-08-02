"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import { buildWeekDays, type WeekCalendarItem } from "@/lib/weekCalendar";

// weekStart passed in from page.tsx is always the Monday of the current
// week (date-fns startOfWeek(now, { weekStartsOn: 1 })) - this order must
// match that, not calendar-index order (which starts Sunday), or every
// label is off by however many days the two conventions disagree by.
const DAY_KEYS = ["dayMon", "dayTue", "dayWed", "dayThu", "dayFri", "daySat", "daySun"] as const;

const VISIBLE_ITEMS_PER_DAY = 2;

function sameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function ItemChip({ item }: { item: WeekCalendarItem }) {
  return (
    <Link
      href={item.href}
      style={{
        display: "block",
        fontSize: 10.5,
        lineHeight: 1.3,
        padding: "3px 6px",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        background:
          item.type === "lecture" ? "var(--color-accent-100)" : "var(--color-accent-2-100)",
        color: item.type === "lecture" ? "var(--color-accent-800)" : "var(--color-accent-2-800)",
      }}
    >
      {item.label}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {days.map((day, i) => {
          const isToday = sameCalendarDay(day.date, today);
          const isExpanded = expanded === i;
          const visible = isExpanded ? day.items : day.items.slice(0, VISIBLE_ITEMS_PER_DAY);
          const hiddenCount = day.items.length - visible.length;

          return (
            <div
              key={i}
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
              {visible.map((item) => (
                <ItemChip key={`${item.type}-${item.id}`} item={item} />
              ))}
              {hiddenCount > 0 && (
                <button
                  type="button"
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
