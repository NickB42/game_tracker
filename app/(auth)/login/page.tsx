import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { auth } from "@/lib/auth/auth";

export default async function LoginPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <section className="app-card w-full p-8">
      <p className="app-caption uppercase tracking-[0.12em]">Secure Access</p>
      <h1 className="mt-2 app-page-title text-3xl">Login</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        Sign in with the credentials provided by your admin.
      </p>

      <LoginForm />

      <div className="mt-6">
        <Link className="app-button app-button-ghost px-0" href="/">
          Back to home
        </Link>
      </div>
    </section>
  );
}
