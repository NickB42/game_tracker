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
        <label htmlFor="email" className="app-field-label mb-1 block">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          data-testid="login-email-input"
          className="app-input"
          placeholder="admin@example.com"
          required
        />
        {errors.email ? <p className="mt-1 text-xs text-[var(--danger)]">{errors.email}</p> : null}
      </div>

      <div>
        <label htmlFor="password" className="app-field-label mb-1 block">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          data-testid="login-password-input"
          className="app-input"
          placeholder="********"
          required
        />
        {errors.password ? <p className="mt-1 text-xs text-[var(--danger)]">{errors.password}</p> : null}
      </div>

      {errors.form ? (
        <div className="app-card-muted border-[color:color-mix(in_srgb,var(--danger)_45%,var(--border))] px-3 py-2 text-sm text-[var(--danger)]">
          {errors.form}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        data-testid="login-submit-button"
        className="app-button app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
