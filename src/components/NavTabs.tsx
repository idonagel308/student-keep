"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

export function NavTabs({ lang }: { lang: Lang }) {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: t(lang, "week"), match: (p: string) => p === "/" },
    { href: "/degree", label: t(lang, "degree"), match: (p: string) => p.startsWith("/degree") },
    {
      href: "/semesters",
      label: t(lang, "semesters"),
      match: (p: string) => p.startsWith("/semesters") || p.startsWith("/courses"),
    },
  ];

  return (
    <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined}>
            <TabLabel label={tab.label} active={active} />
          </Link>
        );
      })}
    </nav>
  );
}

/** Shows the tapped tab as selected right away, while its page loads. */
function TabLabel({ label, active }: { label: string; active: boolean }) {
  const { pending } = useLinkStatus();
  const on = active || pending;
  return (
    <span
      style={{
        fontSize: "13.5px",
        textDecorationLine: on ? "underline" : "none",
        textUnderlineOffset: 5,
        textDecorationColor: "var(--color-accent)",
        textDecorationThickness: 2,
        color: on ? "var(--color-text)" : "var(--color-neutral-600)",
      }}
    >
      {label}
    </span>
  );
}
