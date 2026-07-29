import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/dal";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Welcome back to your course tracker.
      </p>
      <AuthForm mode="login" action={login} />
    </div>
  );
}
