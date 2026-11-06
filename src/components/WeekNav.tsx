import Link from "next/link";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import type { WeekNav as WeekNavData } from "@/lib/weekNav";

/**
 * One control for moving between weeks: ← [week] →. The middle names the
 * week shown ("This week", "Next week", "Last week", or its dates further
 * out) and, away from the current week, links back to it. Plain links to
 * "/?week=YYYY-MM-DD", so Back and bookmarks work without client JavaScript.
 */
export function WeekNav({ nav, lang, rangeLabel }: { nav: WeekNavData; lang: Lang; rangeLabel: string }) {
  const label =
    nav.relative === "this"
      ? t(lang, "week")
      : nav.relative === "next"
        ? t(lang, "nextWeek")
        : nav.relative === "last"
          ? t(lang, "lastWeek")
          : rangeLabel;

  return (
    <nav aria-label={t(lang, "weekNavLabel")} className="week-nav">
      <Link href={nav.prevHref} className="week-nav-step" rel="prev" aria-label={t(lang, "prevWeek")}>
        <span className="nav-arrow" aria-hidden="true">
          ←
        </span>
      </Link>
      {nav.isCurrentWeek ? (
        <span className="week-nav-label">{label}</span>
      ) : (
        <Link
          href="/"
          className="week-nav-label"
          title={t(lang, "backToThisWeek")}
          aria-label={`${label} – ${t(lang, "backToThisWeek")}`}
        >
          {label}
        </Link>
      )}
      <Link href={nav.nextHref} className="week-nav-step" rel="next" aria-label={t(lang, "nextWeek")}>
        <span className="nav-arrow" aria-hidden="true">
          →
        </span>
      </Link>
    </nav>
  );
}
