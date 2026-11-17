import Link from "next/link";
import { listCandidates } from "@/lib/queries";
import { readDb } from "@/lib/store";
import { currentUser, canEdit } from "@/lib/session";
import { PageHeader, SkillTags, StageBadge, fmtLpa, Empty, relDays } from "@/components/ui";
import { SOURCES } from "@/lib/domain";

type SP = { q?: string; skill?: string; source?: string; maxNotice?: string; minExp?: string; maxExp?: string };

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const n = (v?: string) => (v === undefined || v === "" ? undefined : Number(v));
  const rows = listCandidates({ q: sp.q, skill: sp.skill, source: sp.source || undefined, maxNotice: n(sp.maxNotice), minExp: n(sp.minExp), maxExp: n(sp.maxExp) });
  const jobs = new Map(readDb().jobs.map((j) => [j.id, j]));
  const highlight = (sp.skill ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <PageHeader
        title="Candidates"
        subtitle={`${rows.length} candidate${rows.length === 1 ? "" : "s"}`}
        actions={canEdit(user) && <Link href="/candidates/new" className="btn-primary">+ Add candidate</Link>}
      />

      <form className="card mb-4 grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-7">
        <div className="sm:col-span-3 lg:col-span-2">
          <label className="label">Name / phone / email / company</label>
          <input name="q" defaultValue={sp.q} className="input" placeholder="Search…" />
        </div>
        <div className="sm:col-span-2 lg:col-span-2">
          <label className="label">Skills (all must match)</label>
          <input name="skill" defaultValue={sp.skill} className="input" placeholder="Java, Kafka" />
        </div>
        <div>
          <label className="label">Source</label>
          <select name="source" defaultValue={sp.source ?? ""} className="input">
            <option value="">Any</option>
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Max notice</label>
          <select name="maxNotice" defaultValue={sp.maxNotice ?? ""} className="input">
            <option value="">Any</option>
            {[0, 15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d === 0 ? "Immediate" : `≤ ${d} days`}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="label">Exp (yrs)</label>
            <div className="flex gap-1">
              <input name="minExp" defaultValue={sp.minExp} className="input px-2" placeholder="min" inputMode="decimal" />
              <input name="maxExp" defaultValue={sp.maxExp} className="input px-2" placeholder="max" inputMode="decimal" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 sm:col-span-3 lg:col-span-7">
          <button className="btn-secondary">Search</button>
          <Link href="/candidates" className="btn-ghost">Clear</Link>
        </div>
      </form>

      {rows.length === 0 ? (
        <Empty>No candidates match. Try fewer filters.</Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="th">Candidate</th>
                <th className="th">Skills</th>
                <th className="th">Exp</th>
                <th className="th">CTC (cur → exp)</th>
                <th className="th">Notice</th>
                <th className="th">Source</th>
                <th className="th">Active applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ candidate: c, activeApps }) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="td">
                    <Link href={`/candidates/${c.id}`} className="font-medium hover:text-brand-600">{c.name}</Link>
                    <div className="text-xs text-slate-500">{c.currentCompany} · {c.location} · added {relDays(c.createdAt)}</div>
                  </td>
                  <td className="td max-w-64"><SkillTags skills={c.skills} highlight={highlight} /></td>
                  <td className="td tabular-nums">{c.totalExpYears}y</td>
                  <td className="td whitespace-nowrap text-slate-600">{fmtLpa(c.currentCtcLpa)} → {fmtLpa(c.expectedCtcLpa)}</td>
                  <td className="td whitespace-nowrap">{c.noticeDays === 0 ? "Immediate" : `${c.noticeDays}d`}</td>
                  <td className="td text-slate-600">
                    {c.source}
                    {c.sourceDetail && <div className="text-xs text-slate-500">{c.sourceDetail}</div>}
                  </td>
                  <td className="td">
                    <div className="flex flex-col gap-1">
                      {activeApps.length === 0 && <span className="text-xs text-slate-400">—</span>}
                      {activeApps.map((a) => (
                        <span key={a.id} className="flex items-center gap-1.5 text-xs">
                          <StageBadge stage={a.stage} />
                          <span className="truncate text-slate-600">{jobs.get(a.jobId)?.title}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
