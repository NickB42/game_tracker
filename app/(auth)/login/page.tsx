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
    <section className="w-full rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-zinc-900">Login</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Sign in with the credentials provided by your admin.
      </p>

      <LoginForm />

      <div className="mt-6">
        <Link className="text-sm font-medium text-zinc-900 underline" href="/">
          Back to home
        </Link>
      </div>
    </section>
  );
}
