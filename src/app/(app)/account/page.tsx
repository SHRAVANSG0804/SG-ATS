import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { ChangePasswordForm } from "@/components/AuthForms";
import { PageHeader, fmtDateTime } from "@/components/ui";
import { ROLE_LABEL } from "@/lib/domain";

export default async function AccountPage() {
  const user = await currentUser();
  const cred = readDb().credentials.find((c) => c.userId === user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Account" subtitle="Your profile and password." />
      <div className="grid gap-6 md:grid-cols-5">
        <section className="card space-y-3 p-5 text-sm md:col-span-2">
          <div><div className="label">Name</div>{user.name}</div>
          <div><div className="label">Email (sign-in)</div>{user.email}</div>
          <div><div className="label">Role</div>{ROLE_LABEL[user.role]}</div>
          {cred && <div><div className="label">Password last changed</div>{fmtDateTime(cred.updatedAt)}</div>}
          <p className="text-xs text-slate-500">To change your name, email or role, ask your Head of TA.</p>
        </section>
        <section className="card p-5 md:col-span-3">
          <h2 className="mb-4 font-semibold">Change password</h2>
          <ChangePasswordForm />
        </section>
      </div>
    </div>
  );
}
