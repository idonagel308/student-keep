import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/dal";
import { t } from "@/lib/i18n/t";
import type { Lang } from "@/lib/i18n/dictionary";

export async function UserMenu({ lang }: { lang: Lang }) {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span
        className="hidden sm:inline"
        style={{ fontSize: 13, color: "var(--color-neutral-600)" }}
      >
        {user.name ?? user.email}
      </span>
      <form action={logout}>
        <button type="submit" className="btn btn-ghost" style={{ fontSize: 13 }}>
          {t(lang, "signOut")}
        </button>
      </form>
    </div>
  );
}
