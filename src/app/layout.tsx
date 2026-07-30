import type { Metadata } from "next";
import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sourceSerif.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <header className="nav" style={{ maxWidth: 1120, margin: "0 auto", width: "100%" }}>
          <Link href="/" className="nav-brand">
            Student Keep
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginInlineStart: "auto" }}>
            <ThemeToggle />
            <UserMenu />
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
