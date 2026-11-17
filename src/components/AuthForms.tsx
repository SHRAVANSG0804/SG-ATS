"use client";

import { useActionState, useRef, useEffect } from "react";
import { changePassword, createUser, resetUserPassword, type AuthState } from "@/lib/auth-actions";
import { ROLE_LABEL, type Role } from "@/lib/domain";

function Message({ state }: { state: AuthState }) {
  if (!state) return null;
  if (state.error) return <div role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{state.error}</div>;
  return (
    <div role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
      {state.ok}
      {state.tempPassword && (
        <div className="mt-1.5">
          <code className="rounded bg-white px-2 py-1 font-mono text-base text-slate-900 select-all">{state.tempPassword}</code>
          <span className="ml-2 text-xs text-emerald-700">shown once – copy it now</span>
        </div>
      )}
    </div>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Message state={state} />
      <div>
        <label htmlFor="current" className="label">Current password</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label htmlFor="next" className="label">New password</label>
        <input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} className="input" />
        <p className="mt-1 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
      </div>
      <div>
        <label htmlFor="confirm" className="label">Confirm new password</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
      </div>
      <button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Update password"}</button>
    </form>
  );
}

export function AddUserForm() {
  const [state, action, pending] = useActionState(createUser, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Message state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="nu-name" className="label">Full name</label>
          <input id="nu-name" name="name" required className="input" />
        </div>
        <div>
          <label htmlFor="nu-email" className="label">Work email</label>
          <input id="nu-email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label htmlFor="nu-role" className="label">Role</label>
          <select id="nu-role" name="role" defaultValue="recruiter" className="input">
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="nu-pw" className="label">Temporary password (optional)</label>
          <input id="nu-pw" name="password" type="text" autoComplete="off" placeholder="Leave blank to generate" className="input" />
        </div>
      </div>
      <button disabled={pending} className="btn-primary">{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(resetUserPassword, undefined);
  return (
    <div className="space-y-2">
      <form
        action={action}
        onSubmit={(e) => {
          if (!confirm(`Reset ${name}'s password? They will be signed out everywhere.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <button disabled={pending} className="btn-ghost border border-slate-200 text-xs">{pending ? "…" : "Reset password"}</button>
      </form>
      {state && <Message state={state} />}
    </div>
  );
}
