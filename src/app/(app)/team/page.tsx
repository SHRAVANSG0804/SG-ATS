import { redirect } from "next/navigation";
import { currentUser, isHead } from "@/lib/session";
import { readDb } from "@/lib/store";
import { setUserActive, setUserRole } from "@/lib/auth-actions";
import { AddUserForm, ResetPasswordButton } from "@/components/AuthForms";
import { PageHeader, Pill } from "@/components/ui";
import { ROLE_LABEL, type Role } from "@/lib/domain";

export default async function TeamPage() {
  const me = await currentUser();
  if (!isHead(me)) redirect("/dashboard");
  const db = readDb();
  const order: Role[] = ["head", "recruiter", "hiring_manager"];
  const users = [...db.users].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role) || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title="Team & access" subtitle="Create sign-ins for recruiters and hiring managers, reset passwords and remove access." />

      <section className="card mb-6 p-5">
        <h2 className="mb-4 font-semibold">Add a team member</h2>
        <AddUserForm />
      </section>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="th">Person</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Password</th>
              <th className="th">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const cred = db.credentials.find((c) => c.userId === u.id);
              const self = u.id === me.id;
              return (
                <tr key={u.id} className={u.active ? "" : "bg-slate-50 text-slate-400"}>
                  <td className="td">
                    <div className="font-medium">{u.name} {self && <span className="text-xs text-slate-500">(you)</span>}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="td">
                    <form action={setUserRole} className="flex gap-1">
                      <input type="hidden" name="userId" value={u.id} />
                      <select name="role" defaultValue={u.role} className="rounded-md border border-slate-200 px-1.5 py-1 text-sm">
                        {order.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                      <button className="btn-ghost text-xs">Save</button>
                    </form>
                  </td>
                  <td className="td">
                    {u.active ? <Pill tone="green">Active</Pill> : <Pill>Deactivated</Pill>}{" "}
                    {u.active && cred?.mustChangePassword && <Pill tone="amber">Temp password</Pill>}
                  </td>
                  <td className="td"><ResetPasswordButton userId={u.id} name={u.name} /></td>
                  <td className="td">
                    {!self && (
                      <form action={setUserActive}>
                        <input type="hidden" name="userId" value={u.id} />
                        <input type="hidden" name="active" value={String(!u.active)} />
                        <button className={`btn-ghost border text-xs ${u.active ? "border-rose-200 text-rose-600" : "border-emerald-200 text-emerald-700"}`}>
                          {u.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Deactivating someone signs them out immediately and blocks future sign-ins. Their notes and history stay intact.
      </p>
    </>
  );
}
