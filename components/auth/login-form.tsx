"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/auth-client";
import { loginSchema } from "@/lib/validation/auth";

type FormErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = async (formData: FormData) => {
    setErrors({});

    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const issueMap = parsed.error.flatten().fieldErrors;
      setErrors({
        email: issueMap.email?.[0],
        password: issueMap.password?.[0],
      });
      return;
    }

    setIsPending(true);

    const { error } = await authClient.signIn.email({
      email: parsed.data.email,
      password: parsed.data.password,
      callbackURL: "/dashboard",
    });

    setIsPending(false);

    if (error) {
      setErrors({ form: error.message || "Unable to sign in. Please try again." });
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <form action={handleSubmit} className="mt-6 space-y-4" data-testid="login-form">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          data-testid="login-email-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="admin@example.com"
          required
        />
        {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          data-testid="login-password-input"
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          placeholder="********"
          required
        />
        {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password}</p> : null}
      </div>

      {errors.form ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.form}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="login-submit-button"
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
