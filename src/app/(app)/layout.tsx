import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { currentUser } from "@/lib/session";
import { readDb } from "@/lib/store";
import { switchUser, resetDemoData } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const users = readDb().users;

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col gap-6 bg-slate-900 p-4 text-white md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0">
        <Link href="/" className="flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold">M</span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Meridian ATS</span>
            <span className="block text-[11px] text-slate-400">Talent Acquisition</span>
          </span>
        </Link>
        <NavLinks />
        <div className="mt-auto space-y-3 rounded-lg bg-white/5 p-3">
          <div className="text-[11px] font-medium tracking-wide text-slate-400 uppercase">Signed in as (demo)</div>
          <form action={switchUser} className="space-y-2">
            <select
              name="userId"
              defaultValue={user.id}
              className="w-full rounded-md border border-white/10 bg-slate-800 px-2 py-1.5 text-sm text-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {ROLE_LABEL[u.role]}
                </option>
              ))}
            </select>
            <button className="w-full rounded-md bg-white/10 px-2 py-1.5 text-xs font-medium hover:bg-white/20">Switch user</button>
          </form>
          {user.role === "head" && (
            <form action={resetDemoData}>
              <button className="w-full text-left text-[11px] text-slate-400 hover:text-white">↺ Reset demo data</button>
            </form>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {user.role === "hiring_manager" && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Hiring-manager view: you can review candidates and add notes. Stage changes are made by recruiters.
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
