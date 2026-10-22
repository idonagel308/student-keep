import type { Metadata } from "next";
import { getLang } from "@/lib/i18n/getLang";
import { privacyContent } from "@/lib/privacyContent";

export const metadata: Metadata = {
  title: "Privacy note - Student Keep",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const lang = await getLang();
  const content = privacyContent[lang];

  return (
    <article className="animate-in" style={{ maxWidth: 720, padding: "48px 0" }}>
      <h1 style={{ fontSize: "clamp(32px,5vw,44px)", margin: "0 0 8px", lineHeight: 1.1 }}>
        {content.title}
      </h1>
      <p style={{ fontSize: 13, color: "var(--color-neutral-600)", margin: "0 0 24px" }}>
        {content.updated}
      </p>
      <p style={{ fontSize: 16.5, lineHeight: 1.65, margin: "0 0 32px" }}>{content.intro}</p>

      {content.sections.map((section) => (
        <section key={section.heading} style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>{section.heading}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p} style={{ lineHeight: 1.65, margin: "0 0 10px" }}>
              {p}
            </p>
          ))}
          {section.bullets && (
            <ul style={{ lineHeight: 1.65, margin: 0, paddingInlineStart: 22, listStyle: "disc" }}>
              {section.bullets.map((b) => (
                <li key={b} style={{ marginBottom: 6 }}>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
