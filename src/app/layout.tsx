import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { Source_Serif_4, Noto_Serif_Hebrew } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsTrigger } from "@/components/SettingsTrigger";
import { NavTabs } from "@/components/NavTabs";
import { Onboarding } from "@/components/Onboarding";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";
import { getCurrentUser } from "@/lib/dal";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

// Used for dir="rtl" (Hebrew) — swapped from Frank Ruhl Libre for a
// cleaner, more contemporary serif with the same full Hebrew coverage.
const notoSerifHebrew = Noto_Serif_Hebrew({
  variable: "--font-hebrew-serif",
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Student Keep",
  description: "Track semesters, courses, lectures and homework.",
};

const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLang();
  const dir = lang === "he" ? "rtl" : "ltr";
  const user = await getCurrentUser();

  return (
    <html
      lang={lang}
      dir={dir}
      className={`${sourceSerif.variable} ${notoSerifHebrew.variable}`}
      suppressHydrationWarning
    >
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <header className="nav" style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}>
          <Link href="/" className="nav-brand">
            {t(lang, "brand")}
          </Link>
          {user && <NavTabs lang={lang} />}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginInlineStart: "auto" }}>
            <ThemeToggle lang={lang} />
            <SettingsTrigger lang={lang} />
          </div>
        </header>
        <main
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            width: "100%",
            flex: 1,
            padding: "0 22px 60px",
          }}
        >
          {children}
        </main>
        {user && !user.hasCompletedOnboarding && <Onboarding lang={lang} />}
      </body>
    </html>
  );
}
