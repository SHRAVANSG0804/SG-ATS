import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob, clientName, userName } from "@/lib/queries";
import { readDb } from "@/lib/store";
import { currentUser, canEdit } from "@/lib/session";
import { setJobStatus, setJobRecruiter } from "@/lib/actions";
import { PageHeader, Pill, SkillTags, fmtDate, fmtLpa, relDays, StageBadge } from "@/components/ui";
import { StageControls } from "@/components/StageControls";
import { STAGES, EXIT_STAGES, noticeFit, daysBetween } from "@/lib/domain";

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getJob(id);
  if (!data) notFound();
  const { job, apps } = data;
  const user = await currentUser();
  const editor = canEdit(user);
  const recruiters = readDb().users.filter((u) => u.role === "recruiter");
  const left = daysBetween(new Date(), new Date(job.targetClosureDate));
  const exited = apps.filter((a) => (EXIT_STAGES as readonly string[]).includes(a.app.stage));

  return (
    <>
      <div className="mb-2 text-sm text-slate-500">
        <Link href="/jobs" className="hover:underline">Jobs</Link> / {job.code}
      </div>
      <PageHeader
        title={job.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {clientName(job.clientId)} · {job.project} · {job.location}
            <Pill tone={job.status === "Open" ? "green" : "slate"}>{job.status}</Pill>
            {job.hiringType === "Bench" && <Pill tone="blue">Bench</Pill>}
          </span>
        }
        actions={
          editor && (
            <>
              <Link href={`/candidates/new?jobId=${job.id}`} className="btn-primary">+ Add candidate</Link>
              <form action={setJobStatus} className="flex gap-1">
                <input type="hidden" name="jobId" value={job.id} />
                <select name="status" defaultValue={job.status} className="input py-1.5">
                  {["Open", "On Hold", "Closed"].map((s) => <option key={s}>{s}</option>)}
                </select>
                <button className="btn-secondary">Update</button>
              </form>
            </>
          )
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="card p-4 text-sm">
          <div className="label">Experience · CTC</div>
          {job.expMin}–{job.expMax} yrs · {fmtLpa(job.ctcMinLpa)}–{fmtLpa(job.ctcMaxLpa)}
        </div>
        <div className="card p-4 text-sm">
          <div className="label">Billing rate · Openings</div>
          {job.billingRateUsd ? `$${job.billingRateUsd}/hr` : "—"} · {job.openings}
        </div>
        <div className="card p-4 text-sm">
          <div className="label">Target closure</div>
          {fmtDate(job.targetClosureDate)}{" "}
          {left < 0 ? <Pill tone="red">{-left}d overdue</Pill> : <Pill tone={left <= 14 ? "amber" : "slate"}>{left}d left</Pill>}
        </div>
        <div className="card p-4 text-sm">
          <div className="label">Recruiter · Hiring manager</div>
          {editor ? (
            <form action={setJobRecruiter} className="flex gap-1">
              <input type="hidden" name="jobId" value={job.id} />
              <select name="recruiterId" defaultValue={job.recruiterId ?? ""} className="min-w-0 flex-1 rounded border border-slate-200 px-1 py-0.5 text-sm">
                <option value="">Unassigned</option>
                {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button className="btn-ghost text-xs">Save</button>
            </form>
          ) : (
            userName(job.recruiterId)
          )}
          <div className="mt-1 text-slate-500">HM: {userName(job.hiringManagerId)}</div>
        </div>
      </div>
      <div className="mb-6"><SkillTags skills={job.skills} /></div>

      <h2 className="mb-3 font-semibold">Pipeline</h2>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((stage) => {
          const col = apps.filter((a) => a.app.stage === stage);
          return (
            <div key={stage} className="w-64 shrink-0 rounded-xl bg-slate-100 p-2">
              <div className="flex items-center justify-between px-1 pb-2">
                <StageBadge stage={stage} />
                <span className="text-xs font-medium text-slate-500">{col.length}</span>
              </div>
              <div className="space-y-2">
                {col.map(({ app, candidate: c }) => {
                  const fit = noticeFit(c.noticeDays, job.targetClosureDate);
                  const matched = c.skills.filter((s) => job.skills.some((js) => js.toLowerCase() === s.toLowerCase()));
                  return (
                    <div key={app.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <Link href={`/candidates/${c.id}`} className="text-sm font-medium hover:text-brand-600">{c.name}</Link>
                      <div className="text-xs text-slate-500">{c.currentCompany} · {c.totalExpYears} yrs</div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <Pill tone={fit.fits ? "green" : "red"}>{c.noticeDays}d notice</Pill>
                        <Pill tone={c.expectedCtcLpa > job.ctcMaxLpa ? "amber" : "slate"}>exp {fmtLpa(c.expectedCtcLpa)}</Pill>
                        <Pill>{matched.length}/{job.skills.length} skills</Pill>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">in stage since {relDays(app.stageChangedAt)}</div>
                      {editor && <div className="mt-2 border-t border-slate-100 pt-2"><StageControls applicationId={app.id} stage={app.stage} compact /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {exited.length > 0 && (
        <div className="card mt-2 p-4">
          <h3 className="mb-2 text-sm font-semibold">Rejected / dropped out ({exited.length})</h3>
          <ul className="divide-y divide-slate-100 text-sm">
            {exited.map(({ app, candidate }) => (
              <li key={app.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <Link href={`/candidates/${candidate.id}`} className="font-medium hover:underline">{candidate.name}</Link>{" "}
                  <StageBadge stage={app.stage} /> <span className="text-slate-500">— {app.exitReason}</span>
                </span>
                <span className="text-xs text-slate-400">{relDays(app.stageChangedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        <Pill tone="red">red notice</Pill> = notice period longer than the days left until target closure ({Math.max(left, 0)}d).
      </p>
    </>
  );
}
