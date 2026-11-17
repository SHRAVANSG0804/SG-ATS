"use client";

import { useActionState, useState } from "react";
import { createJob } from "@/lib/actions";
import type { Client, User } from "@/lib/domain";
import { LOCATIONS } from "@/lib/domain";

export function JobForm({ clients, recruiters, managers }: { clients: Client[]; recruiters: User[]; managers: User[] }) {
  const [state, action, pending] = useActionState(createJob, undefined);
  const [type, setType] = useState<"Project" | "Bench">("Project");
  const defaultTarget = new Date(Date.now() + 21 * 86_400_000).toISOString().slice(0, 10);

  return (
    <form action={action} className="card space-y-6 p-6">
      {state?.error && <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{state.error}</div>}

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 text-sm font-semibold text-slate-900">Role</legend>
        <div className="md:col-span-2">
          <label className="label">Job title *</label>
          <input name="title" required className="input" placeholder="e.g. Senior Java Developer" />
        </div>
        <div>
          <label className="label">Hiring type</label>
          <select name="hiringType" value={type} onChange={(e) => setType(e.target.value as "Project" | "Bench")} className="input">
            <option value="Project">Project-specific</option>
            <option value="Bench">Bench</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <label className="label">Skills required * (comma-separated)</label>
          <input name="skills" required className="input" placeholder="Java, Spring Boot, Microservices" />
        </div>
      </fieldset>

      {type === "Project" && (
        <fieldset className="grid gap-4 md:grid-cols-3">
          <legend className="mb-3 text-sm font-semibold text-slate-900">Client</legend>
          <div>
            <label className="label">Client *</label>
            <select name="clientId" required className="input" defaultValue="">
              <option value="" disabled>Select client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Project</label>
            <input name="project" className="input" placeholder="e.g. Core Banking Modernisation" />
          </div>
          <div>
            <label className="label">Billing rate (USD / hr)</label>
            <input name="billingRateUsd" type="number" min={0} step="0.5" className="input" />
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-4 md:grid-cols-4">
        <legend className="mb-3 text-sm font-semibold text-slate-900">Requirements</legend>
        <div>
          <label className="label">Exp min (yrs)</label>
          <input name="expMin" type="number" min={0} step="0.5" defaultValue={3} className="input" />
        </div>
        <div>
          <label className="label">Exp max (yrs)</label>
          <input name="expMax" type="number" min={0} step="0.5" defaultValue={6} className="input" />
        </div>
        <div>
          <label className="label">CTC min (₹ LPA)</label>
          <input name="ctcMinLpa" type="number" min={0} step="0.5" defaultValue={8} className="input" />
        </div>
        <div>
          <label className="label">CTC max (₹ LPA)</label>
          <input name="ctcMaxLpa" type="number" min={0} step="0.5" defaultValue={14} className="input" />
        </div>
        <div>
          <label className="label">Location</label>
          <select name="location" className="input">{LOCATIONS.map((l) => <option key={l}>{l}</option>)}</select>
        </div>
        <div>
          <label className="label">Openings</label>
          <input name="openings" type="number" min={1} defaultValue={1} className="input" />
        </div>
        <div className="md:col-span-2">
          <label className="label">Target closure date *</label>
          <input name="targetClosureDate" type="date" required defaultValue={defaultTarget} className="input" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-3 text-sm font-semibold text-slate-900">Ownership</legend>
        <div>
          <label className="label">Recruiter</label>
          <select name="recruiterId" className="input">
            <option value="">Unassigned</option>
            {recruiters.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Hiring manager</label>
          <select name="hiringManagerId" className="input">
            <option value="">—</option>
            {managers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button disabled={pending} className="btn-primary">{pending ? "Saving…" : "Create requisition"}</button>
      </div>
    </form>
  );
}
