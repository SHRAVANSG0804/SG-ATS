"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { createCandidate } from "@/lib/actions";
import { CONSULTANCIES, LOCATIONS, SOURCES, RETENTION_MONTHS } from "@/lib/domain";

type Dup = {
  id: string;
  name: string;
  matchedOn: string;
  addedBy: string;
  addedAt: string;
  activeApplications: { job: string; stage: string; recruiter: string }[];
};

function DuplicateWarning({ dups }: { dups: Dup[] }) {
  if (!dups.length) return null;
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="font-semibold">⚠ Possible duplicate – this person may already be in the system</div>
      <ul className="mt-2 space-y-2">
        {dups.map((d) => (
          <li key={d.id}>
            <Link href={`/candidates/${d.id}`} target="_blank" className="font-medium underline">{d.name}</Link>{" "}
            (matched on {d.matchedOn}) · added by {d.addedBy} on {new Date(d.addedAt).toLocaleDateString("en-IN")}
            {d.activeApplications.length > 0 ? (
              <ul className="mt-1 ml-4 list-disc text-xs">
                {d.activeApplications.map((a, i) => (
                  <li key={i}>
                    <b>{a.stage}</b> for {a.job} — owned by <b>{a.recruiter}</b>. Coordinate before calling.
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs">No active applications – consider adding this job to the existing record instead.</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CandidateForm({ jobs, jobId }: { jobs: { id: string; label: string }[]; jobId?: string }) {
  const [state, action, pending] = useActionState(createCandidate, undefined);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Naukri");
  const [liveDups, setLiveDups] = useState<Dup[]>([]);

  // Live duplicate check as the recruiter types (debounced).
  useEffect(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 && !/^\S+@\S+\.\S+$/.test(email)) {
      setLiveDups([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/candidates/duplicates?phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}`);
      setLiveDups((await r.json()).duplicates);
    }, 300);
    return () => clearTimeout(t);
  }, [phone, email]);

  const dups = (state?.duplicates as Dup[] | undefined) ?? liveDups;

  return (
    <form action={action} className="card space-y-6 p-6">
      {state?.error && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>}

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 text-sm font-semibold">Contact</legend>
        <div>
          <label className="label">Full name *</label>
          <input name="name" required className="input" />
        </div>
        <div>
          <label className="label">Mobile *</label>
          <input name="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="+91 98220 12345" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </div>
        <div className="md:col-span-3">
          <DuplicateWarning dups={dups} />
          {dups.length > 0 && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="confirmDuplicate" /> I have checked – this is a different person, create anyway
            </label>
          )}
        </div>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-4">
        <legend className="mb-3 text-sm font-semibold">Profile</legend>
        <div className="md:col-span-2">
          <label className="label">Current company</label>
          <input name="currentCompany" className="input" />
        </div>
        <div>
          <label className="label">Total experience (yrs)</label>
          <input name="totalExpYears" type="number" min={0} step="0.5" className="input" />
        </div>
        <div>
          <label className="label">Location</label>
          <select name="location" className="input">{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select>
        </div>
        <div>
          <label className="label">Current CTC (₹ LPA)</label>
          <input name="currentCtcLpa" type="number" min={0} step="0.1" className="input" />
        </div>
        <div>
          <label className="label">Expected CTC (₹ LPA)</label>
          <input name="expectedCtcLpa" type="number" min={0} step="0.1" className="input" />
        </div>
        <div>
          <label className="label">Notice period (days)</label>
          <select name="noticeDays" className="input" defaultValue="30">
            {[0, 15, 30, 45, 60, 90].map((d) => <option key={d} value={d}>{d === 0 ? "Immediate" : d}</option>)}
          </select>
        </div>
        <div className="md:col-span-4">
          <label className="label">Skills (comma-separated)</label>
          <input name="skills" className="input" placeholder="Java, Spring Boot, AWS" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 text-sm font-semibold">Source & job</legend>
        <div>
          <label className="label">Source *</label>
          <select name="source" value={source} onChange={(e) => setSource(e.target.value)} className="input">
            {SOURCES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {source === "Consultancy" && (
          <div>
            <label className="label">Consultancy *</label>
            <select name="sourceDetail" required className="input" defaultValue="">
              <option value="" disabled>Select</option>
              {CONSULTANCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}
        {source === "Referral" && (
          <div>
            <label className="label">Referred by (employee) *</label>
            <input name="sourceDetail" required className="input" />
          </div>
        )}
        <div className={source === "Consultancy" || source === "Referral" ? "" : "md:col-span-2"}>
          <label className="label">Apply to job (optional)</label>
          <select name="jobId" defaultValue={jobId ?? ""} className="input">
            <option value="">— none —</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.label}</option>)}
          </select>
        </div>
      </fieldset>

      <label className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-sm">
        <input type="checkbox" name="consent" className="mt-0.5" required />
        <span>
          The candidate has consented to Meridian processing their personal data for recruitment. Data will be retained for{" "}
          {RETENTION_MONTHS} months and then deleted (DPDP Act, 2023).
        </span>
      </label>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Save candidate"}</button>
      </div>
    </form>
  );
}
