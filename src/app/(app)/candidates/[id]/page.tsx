import Link from "next/link";
import { notFound } from "next/navigation";
import { getCandidate, userName, clientName, findDuplicates } from "@/lib/queries";
import { readDb } from "@/lib/store";
import { currentUser, canEdit } from "@/lib/session";
import { addNote, applyToJob } from "@/lib/actions";
import { PageHeader, Pill, SkillTags, StageBadge, fmtDate, fmtDateTime, fmtLpa, relDays, Empty } from "@/components/ui";
import { StageControls } from "@/components/StageControls";
import { noticeFit } from "@/lib/domain";

export default async function CandidateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = getCandidate(id);
  if (!data) notFound();
  const { candidate: c, apps, notes } = data;
  const user = await currentUser();
  const editor = canEdit(user);
  const appliedJobIds = new Set(apps.map((a) => a.job.id));
  const openJobs = readDb().jobs.filter((j) => j.status === "Open" && !appliedJobIds.has(j.id));
  const dups = findDuplicates(c.phone, c.email, c.id);

  return (
    <>
      <div className="mb-2 text-sm text-slate-500">
        <Link href="/candidates" className="hover:underline">Candidates</Link> / {c.name}
      </div>
      <PageHeader
        title={c.name}
        subtitle={`${c.currentCompany || "—"} · ${c.totalExpYears} yrs · ${c.location}`}
      />

      {dups.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠ Shares {dups[0].matchedOn} with{" "}
          {dups.map((d, i) => (
            <span key={d.id}>{i > 0 && ", "}<Link href={`/candidates/${d.id}`} className="font-medium underline">{d.name}</Link></span>
          ))}
          . Consider merging these records.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div><div className="label">Phone</div>{c.phone}</div>
              <div className="col-span-1 sm:col-span-3"><div className="label">Email</div>{c.email}</div>
              <div><div className="label">Current CTC</div>{fmtLpa(c.currentCtcLpa)}</div>
              <div><div className="label">Expected CTC</div>{fmtLpa(c.expectedCtcLpa)}{c.currentCtcLpa > 0 && <span className="ml-1 text-xs text-slate-500">(+{Math.round(((c.expectedCtcLpa - c.currentCtcLpa) / c.currentCtcLpa) * 100)}%)</span>}</div>
              <div><div className="label">Notice</div>{c.noticeDays === 0 ? "Immediate" : `${c.noticeDays} days`}</div>
              <div><div className="label">Source</div>{c.source}{c.sourceDetail && <span className="text-slate-500"> · {c.sourceDetail}</span>}</div>
            </div>
            <div className="mt-4"><div className="label">Skills</div><SkillTags skills={c.skills} /></div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Applications ({apps.length})</h2>
              {editor && openJobs.length > 0 && (
                <form action={applyToJob} className="flex gap-1">
                  <input type="hidden" name="candidateId" value={c.id} />
                  <select name="jobId" required defaultValue="" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                    <option value="" disabled>Add to another job…</option>
                    {openJobs.map((j) => <option key={j.id} value={j.id}>{j.code} · {j.title}</option>)}
                  </select>
                  <button className="btn-secondary py-1.5">Add</button>
                </form>
              )}
            </div>
            {apps.length === 0 && <Empty>Not linked to any job yet.</Empty>}
            <div className="space-y-4">
              {apps.map(({ app, job, events }) => {
                const fit = noticeFit(c.noticeDays, job.targetClosureDate);
                return (
                  <div key={app.id} className="rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 p-4">
                      <div>
                        <Link href={`/jobs/${job.id}`} className="font-medium hover:text-brand-600">{job.title}</Link>
                        <div className="text-xs text-slate-500">{job.code} · {clientName(job.clientId)} · recruiter {userName(job.recruiterId)}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StageBadge stage={app.stage} />
                          {app.exitReason && <span className="text-xs text-slate-500">{app.exitReason}</span>}
                          {app.stage !== "Joined" && !app.exitReason && (
                            <Pill tone={fit.fits ? "green" : "red"}>
                              {fit.fits ? "Notice fits target date" : `Notice exceeds target by ${fit.gap}d`}
                            </Pill>
                          )}
                        </div>
                      </div>
                      {editor && <StageControls applicationId={app.id} stage={app.stage} />}
                    </div>
                    <ol className="space-y-1.5 p-4 text-xs">
                      {events.map((e) => (
                        <li key={e.id} className="flex flex-wrap gap-x-2 text-slate-600">
                          <span className="w-28 shrink-0 text-slate-400">{fmtDateTime(e.at)}</span>
                          <span>
                            {e.fromStage ? <>{e.fromStage} → </> : "Created at "}
                            <b className="text-slate-800">{e.toStage}</b>
                            {e.reason && <> · {e.reason}</>} · by {userName(e.by)}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Notes</h2>
            <form action={addNote} className="mb-4 space-y-2">
              <input type="hidden" name="candidateId" value={c.id} />
              <textarea name="body" required rows={3} className="input" placeholder="Call summary, competing offers, availability…" />
              <div className="flex gap-2">
                <select name="applicationId" className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 text-xs">
                  <option value="">General note</option>
                  {apps.map(({ app, job }) => <option key={app.id} value={app.id}>Re: {job.title}</option>)}
                </select>
                <button className="btn-primary py-1.5">Add note</button>
              </div>
            </form>
            <ul className="space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="whitespace-pre-wrap text-slate-800">{n.body}</p>
                  <div className="mt-1.5 text-xs text-slate-500">
                    {userName(n.authorId)} · {fmtDateTime(n.at)}
                    {n.applicationId && <> · re {apps.find((a) => a.app.id === n.applicationId)?.job.title}</>}
                  </div>
                </li>
              ))}
              {notes.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
            </ul>
          </section>

          <section className="card p-5 text-xs text-slate-600">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">Record & privacy</h2>
            <p>Added by {userName(c.createdBy)} {relDays(c.createdAt)}</p>
            <p>Consent recorded {fmtDate(c.consentAt)}</p>
            <p>Retain until <b>{fmtDate(c.retainUntil)}</b> (DPDP Act)</p>
          </section>
        </aside>
      </div>
    </>
  );
}
