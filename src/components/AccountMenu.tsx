import Link from "next/link";
import { signOut, signOutAll, switchAccount } from "@/lib/auth-actions";
import { ROLE_LABEL, type User } from "@/lib/domain";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

function Avatar({ name, small }: { name: string; small?: boolean }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-brand-500 font-semibold text-white ${small ? "h-7 w-7 text-[11px]" : "h-9 w-9 text-xs"}`}>
      {initials(name)}
    </span>
  );
}

/** Sidebar account switcher: active account, other signed-in accounts, add account, sign out. */
export function AccountMenu({ user, others }: { user: User; others: User[] }) {
  return (
    <details className="group rounded-lg bg-white/5 open:bg-white/10">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 p-3">
        <Avatar name={user.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{user.name}</span>
          <span className="block truncate text-[11px] text-slate-400">{ROLE_LABEL[user.role]} · {user.email}</span>
        </span>
        <span className="text-slate-400 transition group-open:rotate-180" aria-hidden>▾</span>
      </summary>

      <div className="space-y-1 border-t border-white/10 p-2 text-sm">
        {others.length > 0 && (
          <>
            <div className="px-2 pt-1 pb-1 text-[11px] font-medium tracking-wide text-slate-400 uppercase">Switch account</div>
            {others.map((o) => (
              <form key={o.id} action={switchAccount}>
                <input type="hidden" name="userId" value={o.id} />
                <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-white/10">
                  <Avatar name={o.name} small />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{o.name}</span>
                    <span className="block truncate text-[11px] text-slate-400">{ROLE_LABEL[o.role]}</span>
                  </span>
                </button>
              </form>
            ))}
            <div className="my-1 border-t border-white/10" />
          </>
        )}
        <Link href="/login?add=1" className="block rounded-md px-2 py-1.5 hover:bg-white/10">+ Add another account</Link>
        <Link href="/account" className="block rounded-md px-2 py-1.5 hover:bg-white/10">Account & password</Link>
        <form action={signOut}>
          <button className="w-full rounded-md px-2 py-1.5 text-left hover:bg-white/10">Sign out{others.length ? ` of ${user.name.split(" ")[0]}` : ""}</button>
        </form>
        {others.length > 0 && (
          <form action={signOutAll}>
            <button className="w-full rounded-md px-2 py-1.5 text-left text-slate-400 hover:bg-white/10 hover:text-white">Sign out of all accounts</button>
          </form>
        )}
      </div>
    </details>
  );
}
