import { redirect } from "next/navigation";
import { signup } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/dal";
import { getLang } from "@/lib/i18n/getLang";
import { t } from "@/lib/i18n/t";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  const lang = await getLang();

  return (
    <main
      className="animate-in"
      style={{
        minHeight: "60vh",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 48,
        alignItems: "center",
        padding: "60px 0",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--color-accent)",
            marginBottom: 12,
          }}
        >
          {t(lang, "signupKicker")}
        </div>
        <h1 style={{ fontSize: "clamp(36px,6vw,56px)", margin: "0 0 16px", lineHeight: 1.05 }}>
          {t(lang, "brand")}
        </h1>
        <p
          style={{
            fontSize: "16.5px",
            lineHeight: 1.6,
            color: "var(--color-neutral-600)",
            margin: 0,
            maxWidth: "36ch",
          }}
        >
          {t(lang, "signupBlurb")}
        </p>
      </div>
      <div style={{ width: "100%", maxWidth: 370, justifySelf: "end" }}>
        <AuthForm mode="signup" action={signup} lang={lang} />
      </div>
    </main>
  );
}
