import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { AccountMenu } from "@/components/AccountMenu";
import { currentUser, isHead, mustChangePassword, signedInAccounts } from "@/lib/session";
import { resetDemoData } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const others = (await signedInAccounts()).map((a) => a.user).filter((u) => u.id !== user.id);
  const showDemoReset = isHead(user) && process.env.NODE_ENV !== "production";

  return (
    <div className="min-h-screen md:flex">
      <aside className="flex flex-col gap-6 bg-slate-900 p-4 text-white md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0">
        <Link href="/" className="flex items-center gap-2 px-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold">M</span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Meridian ATS</span>
            <span className="block text-[11px] text-slate-400">Talent Acquisition</span>
          </span>
        </Link>
        <NavLinks showTeam={isHead(user)} />
        <div className="mt-auto space-y-2">
          <AccountMenu key={user.id} user={user} others={others} />
          {showDemoReset && (
            <form action={resetDemoData}>
              <button className="px-3 text-left text-[11px] text-slate-500 hover:text-white">↺ Reset demo data (dev only)</button>
            </form>
          )}
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">
        {mustChangePassword(user.id) && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
            <span>You are using a temporary password. Please set your own.</span>
            <Link href="/account" className="font-medium underline">Change password →</Link>
          </div>
        )}
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
