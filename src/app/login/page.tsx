import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { signedInAccounts } from "@/lib/session";
import { readDb } from "@/lib/store";
import { DEFAULT_PASSWORD } from "@/lib/seed";
import { ROLE_LABEL } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; add?: string }> }) {
  const sp = await searchParams;
  const accounts = await signedInAccounts();
  const adding = sp.add === "1";
  if (accounts.length && !adding) redirect(sp.next?.startsWith("/") ? sp.next : "/dashboard");

  // Demo account list is shown only in local development, never on a deployed site.
  const showDemo = process.env.NODE_ENV !== "production";
  const demoUsers = showDemo ? readDb().users.filter((u) => u.active) : [];

  return (
    <div className="grid min-h-screen place-items-center bg-slate-900 px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 font-bold">M</span>
          <span className="text-lg font-semibold">Meridian ATS</span>
        </Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-semibold">{adding ? "Add another account" : "Sign in"}</h1>
          <p className="mt-1 mb-6 text-sm text-slate-500">
            {adding
              ? "Sign in with a second account. You can switch between accounts from the sidebar."
              : "Use the work email and password your Head of TA gave you."}
          </p>
          <LoginForm next={sp.next ?? "/dashboard"} />
          {adding && accounts.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-4 text-sm">
              <div className="mb-2 text-xs font-medium text-slate-500 uppercase">Already signed in</div>
              {accounts.map(({ user }) => (
                <div key={user.id} className="text-slate-700">{user.name} · {user.email}</div>
              ))}
              <Link href="/dashboard" className="mt-3 inline-block text-brand-600 hover:underline">← Back to the app</Link>
            </div>
          )}
        </div>

        {showDemo && (
          <details className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-slate-300">
            <summary className="cursor-pointer font-medium text-white">Development only: seeded accounts</summary>
            <p className="mt-2 text-xs">
              Starting password for all of them: <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">{DEFAULT_PASSWORD}</code>
              {" "}(each user is asked to change it). This box is hidden in production.
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {demoUsers.map((u) => (
                <li key={u.id}><span className="text-white">{u.email}</span> · {ROLE_LABEL[u.role]}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
