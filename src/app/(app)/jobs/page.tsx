import Link from "next/link";
import { listJobs, clientName, userName } from "@/lib/queries";
import { currentUser, canEdit } from "@/lib/session";
import { PageHeader, Pill, SkillTags, fmtDate, fmtLpa, Empty } from "@/components/ui";
import { daysBetween } from "@/lib/domain";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; mine?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const status = sp.status ?? "Open";
  const rows = listJobs({ status, q: sp.q, recruiterId: sp.mine ? user.id : undefined });

  return (
    <>
      <PageHeader
        title="Job requisitions"
        subtitle="Every role is tied to a client project (or the bench) with a billing rate and target closure date."
        actions={canEdit(user) && <Link href="/jobs/new" className="btn-primary">+ New requisition</Link>}
      />

      <form className="card mb-4 flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-56 flex-1">
          <label className="label">Search</label>
          <input name="q" defaultValue={sp.q} placeholder="Title, client, project, skill, REQ code…" className="input" />
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={status} className="input">
            {["Open", "On Hold", "Closed", "All"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {user.role === "recruiter" && (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="mine" value="1" defaultChecked={!!sp.mine} /> Only my jobs
          </label>
        )}
        <button className="btn-secondary">Apply</button>
      </form>

      {rows.length === 0 ? (
        <Empty>No requisitions match these filters.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Requisition</th>
                <th className="th">Client / project</th>
                <th className="th">Exp · CTC</th>
                <th className="th">Recruiter</th>
                <th className="th">Pipeline</th>
                <th className="th">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ job, active, joined, offered }) => {
                const left = daysBetween(new Date(), new Date(job.targetClosureDate));
                return (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="td">
                      <Link href={`/jobs/${job.id}`} className="font-medium text-slate-900 hover:text-brand-600">{job.title}</Link>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        {job.code} · {job.location} · {job.openings} opening{job.openings > 1 && "s"}
                        {job.status !== "Open" && <Pill>{job.status}</Pill>}
                      </div>
                      <div className="mt-1.5"><SkillTags skills={job.skills} /></div>
                    </td>
                    <td className="td">
                      <div>{clientName(job.clientId)}</div>
                      <div className="text-xs text-slate-500">
                        {job.project}
                        {job.billingRateUsd ? ` · $${job.billingRateUsd}/hr` : ""}
                      </div>
                    </td>
                    <td className="td text-slate-600">
                      {job.expMin}–{job.expMax} yrs
                      <div className="text-xs">{fmtLpa(job.ctcMinLpa)}–{fmtLpa(job.ctcMaxLpa)}</div>
                    </td>
                    <td className="td text-slate-600">{userName(job.recruiterId)}</td>
                    <td className="td text-xs text-slate-600">
                      <div><b className="text-slate-900">{active}</b> active</div>
                      <div>{offered} offer/BGV · {joined} joined</div>
                    </td>
                    <td className="td whitespace-nowrap">
                      <div className="text-sm">{fmtDate(job.targetClosureDate)}</div>
                      {job.status === "Open" &&
                        (left < 0 ? <Pill tone="red">{-left}d overdue</Pill> : left <= 14 ? <Pill tone="amber">{left}d left</Pill> : <span className="text-xs text-slate-500">{left}d left</span>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
