import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/dal";

export async function UserMenu() {
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
          Sign out
        </button>
      </form>
    </div>
  );
}
