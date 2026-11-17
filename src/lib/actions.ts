"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mutate, newId, nowIso, resetDb } from "./store";
import { canEdit, currentUser } from "./session";
import { findDuplicates } from "./queries";
import {
  ALL_STAGES,
  CONSULTANCIES,
  RETENTION_MONTHS,
  SOURCES,
  normalisePhone,
  parseSkills,
  type HiringType,
  type JobStatus,
  type Source,
  type Stage,
} from "./domain";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => {
  const v = Number(str(f, k));
  return Number.isFinite(v) ? v : 0;
};

async function requireEditor() {
  const user = await currentUser();
  if (!canEdit(user)) throw new Error("Hiring managers have read-only access.");
  return user;
}

export type FormState = { error?: string; duplicates?: ReturnType<typeof findDuplicates> } | undefined;

export async function createJob(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireEditor();
  const hiringType = (str(formData, "hiringType") || "Project") as HiringType;
  const title = str(formData, "title");
  const skills = parseSkills(str(formData, "skills"));
  const expMin = num(formData, "expMin");
  const expMax = num(formData, "expMax");
  const ctcMin = num(formData, "ctcMinLpa");
  const ctcMax = num(formData, "ctcMaxLpa");
  const target = str(formData, "targetClosureDate");

  if (!title) return { error: "Job title is required." };
  if (hiringType === "Project" && !str(formData, "clientId")) return { error: "Project hiring needs a client." };
  if (!skills.length) return { error: "Add at least one required skill." };
  if (expMax < expMin) return { error: "Experience band: max must be ≥ min." };
  if (ctcMax < ctcMin) return { error: "CTC range: max must be ≥ min." };
  if (!target) return { error: "Target closure date is required." };

  const id = mutate((db) => {
    db.counters.job += 1;
    const id = newId();
    db.jobs.push({
      id,
      code: `REQ-${String(db.counters.job).padStart(4, "0")}`,
      title,
      clientId: hiringType === "Bench" ? null : str(formData, "clientId"),
      project: hiringType === "Bench" ? "Bench pool" : str(formData, "project"),
      hiringType,
      billingRateUsd: hiringType === "Bench" ? null : num(formData, "billingRateUsd") || null,
      skills,
      expMin,
      expMax,
      ctcMinLpa: ctcMin,
      ctcMaxLpa: ctcMax,
      location: str(formData, "location"),
      openings: Math.max(1, num(formData, "openings")),
      targetClosureDate: target,
      status: "Open",
      recruiterId: str(formData, "recruiterId") || null,
      hiringManagerId: str(formData, "hiringManagerId") || null,
      createdAt: nowIso(),
      createdBy: user.id,
    });
    return id;
  });
  revalidatePath("/jobs");
  redirect(`/jobs/${id}`);
}

export async function setJobStatus(formData: FormData) {
  await requireEditor();
  const id = str(formData, "jobId");
  const status = str(formData, "status") as JobStatus;
  mutate((db) => {
    const job = db.jobs.find((j) => j.id === id);
    if (job) job.status = status;
  });
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/jobs");
}

export async function setJobRecruiter(formData: FormData) {
  await requireEditor();
  const id = str(formData, "jobId");
  mutate((db) => {
    const job = db.jobs.find((j) => j.id === id);
    if (job) job.recruiterId = str(formData, "recruiterId") || null;
  });
  revalidatePath(`/jobs/${id}`);
}

export async function createCandidate(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireEditor();
  const name = str(formData, "name");
  const phone = normalisePhone(str(formData, "phone"));
  const email = str(formData, "email").toLowerCase();
  const source = str(formData, "source") as Source;
  const sourceDetail = str(formData, "sourceDetail");

  if (!name) return { error: "Name is required." };
  if (phone.length !== 10) return { error: "Enter a valid 10-digit mobile number." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (!SOURCES.includes(source)) return { error: "Pick a source." };
  if (source === "Consultancy" && !CONSULTANCIES.includes(sourceDetail as (typeof CONSULTANCIES)[number]))
    return { error: "Pick which consultancy sent this candidate." };
  if (source === "Referral" && !sourceDetail) return { error: "Enter the referring employee's name." };
  if (formData.get("consent") !== "on")
    return { error: "Candidate consent to process personal data is required (DPDP Act)." };

  const duplicates = findDuplicates(phone, email);
  if (duplicates.length && formData.get("confirmDuplicate") !== "on") {
    return { error: "This candidate may already exist. Review below before creating a new record.", duplicates };
  }

  const now = new Date();
  const retain = new Date(now);
  retain.setMonth(retain.getMonth() + RETENTION_MONTHS);

  const id = mutate((db) => {
    const id = newId();
    db.candidates.push({
      id,
      name,
      phone,
      email,
      currentCompany: str(formData, "currentCompany"),
      currentCtcLpa: num(formData, "currentCtcLpa"),
      expectedCtcLpa: num(formData, "expectedCtcLpa"),
      noticeDays: num(formData, "noticeDays"),
      totalExpYears: num(formData, "totalExpYears"),
      skills: parseSkills(str(formData, "skills")),
      location: str(formData, "location"),
      source,
      sourceDetail: source === "Consultancy" || source === "Referral" ? sourceDetail : "",
      consentAt: now.toISOString(),
      retainUntil: retain.toISOString(),
      createdAt: now.toISOString(),
      createdBy: user.id,
    });
    const jobId = str(formData, "jobId");
    if (jobId) addApplication(db, id, jobId, user.id);
    return id;
  });
  revalidatePath("/candidates");
  redirect(`/candidates/${id}`);
}

function addApplication(db: Parameters<Parameters<typeof mutate>[0]>[0], candidateId: string, jobId: string, by: string) {
  if (db.applications.some((a) => a.candidateId === candidateId && a.jobId === jobId)) return false;
  const at = nowIso();
  const id = newId();
  db.applications.push({ id, candidateId, jobId, stage: "Applied", stageChangedAt: at, exitReason: null, createdAt: at, createdBy: by });
  db.stageEvents.push({ id: newId(), applicationId: id, fromStage: null, toStage: "Applied", reason: null, at, by });
  return true;
}

export async function applyToJob(formData: FormData) {
  const user = await requireEditor();
  const candidateId = str(formData, "candidateId");
  const jobId = str(formData, "jobId");
  if (!jobId) return;
  mutate((db) => addApplication(db, candidateId, jobId, user.id));
  revalidatePath(`/candidates/${candidateId}`);
  revalidatePath(`/jobs/${jobId}`);
}

export async function moveStage(formData: FormData) {
  const user = await requireEditor();
  const appId = str(formData, "applicationId");
  const to = str(formData, "toStage") as Stage;
  const reason = str(formData, "reason") || null;
  if (!ALL_STAGES.includes(to)) throw new Error("Unknown stage");
  if ((to === "Rejected" || to === "Dropped Out") && !reason) throw new Error("A reason is required.");

  const app = mutate((db) => {
    const app = db.applications.find((a) => a.id === appId);
    if (!app || app.stage === to) return app;
    const at = nowIso();
    db.stageEvents.push({ id: newId(), applicationId: app.id, fromStage: app.stage, toStage: to, reason, at, by: user.id });
    app.stage = to;
    app.stageChangedAt = at;
    app.exitReason = to === "Rejected" || to === "Dropped Out" ? reason : null;
    return app;
  });
  if (app) {
    revalidatePath(`/jobs/${app.jobId}`);
    revalidatePath(`/candidates/${app.candidateId}`);
    revalidatePath("/dashboard");
  }
}

export async function addNote(formData: FormData) {
  const user = await currentUser(); // hiring managers may comment too
  const candidateId = str(formData, "candidateId");
  const body = str(formData, "body");
  if (!body) return;
  mutate((db) => {
    db.notes.push({
      id: newId(),
      candidateId,
      applicationId: str(formData, "applicationId") || null,
      body,
      authorId: user.id,
      at: nowIso(),
    });
  });
  revalidatePath(`/candidates/${candidateId}`);
}

export async function resetDemoData() {
  const user = await currentUser();
  if (user.role !== "head") throw new Error("Only the Head of TA can reset data.");
  if (process.env.NODE_ENV === "production") throw new Error("Demo reset is disabled in production.");
  resetDb(); // also clears all sessions, so everyone signs in again
  redirect("/login");
}
