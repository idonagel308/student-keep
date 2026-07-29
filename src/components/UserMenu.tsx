import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/dal";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="ml-auto flex items-center gap-3">
      <span className="hidden text-sm text-slate-500 sm:inline dark:text-slate-400">
        {user.name ?? user.email}
      </span>
      <form action={logout}>
        <button
          type="submit"
          className="text-sm text-slate-500 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
