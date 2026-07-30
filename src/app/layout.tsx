import type { Metadata } from "next";
import Link from "next/link";
import { Source_Serif_4, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsTrigger } from "@/components/SettingsTrigger";
import { NavTabs } from "@/components/NavTabs";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";
import { getCurrentUser } from "@/lib/dal";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

// Used for dir="rtl" (Hebrew) — the mock swaps to this serif specifically
// for RTL rather than reusing Source Serif 4's own Hebrew glyphs.
const frankRuhlLibre = Frank_Ruhl_Libre({
  variable: "--font-frank-ruhl",
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
      className={`${sourceSerif.variable} ${frankRuhlLibre.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
      </body>
    </html>
  );
}
