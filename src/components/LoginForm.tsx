"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="eyebrow">Password</label>
        <PasswordField id="password" name="password" required placeholder="••••••••" aria-invalid={Boolean(state?.error)} aria-describedby={state?.error ? "login-error" : undefined} />
      </div>
      {state?.error ? (
        <p id="login-error" role="alert" className="text-sm text-danger">{state.error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}