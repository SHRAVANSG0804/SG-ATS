import Link from "next/link";
import { dashboard, clientName } from "@/lib/queries";
import { currentUser } from "@/lib/session";
import { PageHeader, Stat, fmtDate, Pill } from "@/components/ui";
import { daysBetween } from "@/lib/domain";

export default async function DashboardPage() {
  const d = dashboard();
  const user = await currentUser();
  const maxFunnel = Math.max(1, ...d.funnel.map((f) => f.count));
  const maxSource = Math.max(1, ...d.sources.map((s) => s.applications));

  return (
    <>
      <PageHeader title={`Good day, ${user.name.split(" ")[0]}`} subtitle="Live hiring status across all clients and locations." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label="Open requisitions" value={d.openJobs} hint={`${d.openPositions} positions to fill`} />
        <Stat label="Active candidates" value={d.activeCandidates} hint={`${d.totalCandidates} in database`} />
        <Stat
          label="Offer drop-out rate"
          value={d.offer.dropRate === null ? "—" : `${d.offer.dropRate}%`}
          tone={d.offer.dropRate !== null && d.offer.dropRate > 25 ? "red" : "green"}
          hint={`${d.offer.dropped} dropped · ${d.offer.joined} joined · ${d.offer.pending} pending`}
        />
        <Stat label="Avg time to fill" value={d.avgTimeToFill === null ? "—" : `${d.avgTimeToFill}d`} hint="Requisition → first join" />
        <Stat label="Past target date" value={d.overdue.length} tone={d.overdue.length ? "red" : undefined} hint={`${d.dueSoon.length} due in next 14 days`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold">Pipeline funnel</h2>
          <p className="text-xs text-slate-500">Applications that have ever reached each stage</p>
          <div className="mt-4 space-y-2.5">
            {d.funnel.map((f) => (
              <div key={f.stage} className="grid grid-cols-[130px_1fr_36px] items-center gap-3 text-sm">
                <span className="text-slate-600">{f.stage}</span>
                <div className="h-5 rounded bg-slate-100">
                  <div className="h-5 rounded bg-brand-500" style={{ width: `${(f.count / maxFunnel) * 100}%` }} />
                </div>
                <span className="text-right font-medium tabular-nums">{f.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>Currently rejected: <b className="text-slate-700">{d.byStage.Rejected}</b></span>
            <span>Dropped out: <b className="text-slate-700">{d.byStage["Dropped Out"]}</b></span>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Source effectiveness</h2>
          <p className="text-xs text-slate-500">Which channel actually produces joiners</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="py-1.5 text-left font-medium">Source</th>
                <th className="py-1.5 text-left font-medium">Volume</th>
                <th className="py-1.5 text-right font-medium">Interviews</th>
                <th className="py-1.5 text-right font-medium">Offers</th>
                <th className="py-1.5 text-right font-medium">Joined</th>
                <th className="py-1.5 text-right font-medium">Yield</th>
              </tr>
            </thead>
            <tbody>
              {d.sources.map((s) => (
                <tr key={s.source} className="border-t border-slate-100">
                  <td className="py-2 font-medium">{s.source}</td>
                  <td className="py-2 pr-3">
                    <div className="h-2 w-full rounded bg-slate-100">
                      <div className="h-2 rounded bg-brand-500" style={{ width: `${(s.applications / maxSource) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{s.applications}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{s.interviews}</td>
                  <td className="py-2 text-right tabular-nums">{s.offers}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{s.joined}</td>
                  <td className="py-2 text-right tabular-nums">{s.applications ? Math.round((s.joined / s.applications) * 100) : 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-slate-500">
            Consultancy fees on joiners so far (8.33% of CTC):{" "}
            <b className="text-slate-700">₹{d.sources.find((s) => s.source === "Consultancy")!.feeLpa.toFixed(2)} L</b>
          </p>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Needs attention</h2>
          <p className="text-xs text-slate-500">Open requisitions past or near their target closure date</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {[...d.overdue, ...d.dueSoon].slice(0, 8).map((j) => {
              const left = daysBetween(new Date(), new Date(j.targetClosureDate));
              return (
                <li key={j.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/jobs/${j.id}`} className="min-w-0 hover:underline">
                    <span className="font-medium">{j.title}</span>{" "}
                    <span className="text-slate-500">· {clientName(j.clientId)}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-slate-500">{fmtDate(j.targetClosureDate)}</span>
                    {left < 0 ? <Pill tone="red">{-left}d overdue</Pill> : <Pill tone="amber">{left}d left</Pill>}
                  </span>
                </li>
              );
            })}
            {!d.overdue.length && !d.dueSoon.length && <li className="py-3 text-sm text-slate-500">Nothing urgent.</li>}
          </ul>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold">Recruiter workload</h2>
          <p className="text-xs text-slate-500">Open requisitions and active candidates per recruiter</p>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {d.recruiters.map((r) => (
                <tr key={r.user.id} className="border-t border-slate-100 first:border-0">
                  <td className="py-2.5 font-medium">{r.user.name}</td>
                  <td className="py-2.5 text-right text-slate-600">{r.openJobs} job{r.openJobs === 1 ? "" : "s"}</td>
                  <td className="py-2.5 text-right text-slate-600">{r.activeCandidates} active candidates</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
