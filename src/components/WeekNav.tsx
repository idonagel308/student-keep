import Link from "next/link";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";
import type { WeekNav as WeekNavData } from "@/lib/weekNav";

/**
 * Previous / next week links for the "This week" page. Plain links to
 * "/?week=YYYY-MM-DD", so the browser's back button and bookmarks work and no
 * client JavaScript is needed. "This week" only appears away from it.
 */
export function WeekNav({ nav, lang }: { nav: WeekNavData; lang: Lang }) {
  return (
    <nav aria-label={t(lang, "weekNavLabel")} className="week-nav">
      <Link href={nav.prevHref} className="btn btn-secondary" rel="prev">
        <span className="nav-arrow" aria-hidden="true">
          ←
        </span>
        {t(lang, "prevWeek")}
      </Link>
      <Link href={nav.nextHref} className="btn btn-secondary" rel="next">
        {t(lang, "nextWeek")}
        <span className="nav-arrow" aria-hidden="true">
          →
        </span>
      </Link>
      {!nav.isCurrentWeek && (
        <Link href="/" className="btn btn-ghost">
          {t(lang, "week")}
        </Link>
      )}
    </nav>
  );
}
