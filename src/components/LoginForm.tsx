"use client";

import { useActionState, useState } from "react";
import { login } from "@/lib/auth-actions";

export function LoginForm({ next, defaultEmail = "" }: { next: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state?.error && (
        <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{state.error}</div>
      )}
      <div>
        <label htmlFor="email" className="label">Work email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus defaultValue={defaultEmail} className="input" placeholder="you@meridian.com" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="label">Password</label>
          <button type="button" onClick={() => setShow((s) => !s)} className="mb-1 text-xs text-brand-600 hover:underline">
            {show ? "Hide" : "Show"}
          </button>
        </div>
        <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="input" />
      </div>
      <button disabled={pending} className="btn-primary w-full py-2.5">{pending ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-xs text-slate-500">Forgot your password? Ask your Head of TA to reset it.</p>
    </form>
  );
}
