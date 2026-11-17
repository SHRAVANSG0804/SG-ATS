// Domain model for the Meridian ATS.
// Every rule here comes straight from the Head of TA's brief.

export const STAGES = [
  "Applied",
  "Screened",
  "Internal Interview",
  "Client Round",
  "Offered",
  "BGV",
  "Joined",
] as const;

export const EXIT_STAGES = ["Rejected", "Dropped Out"] as const;

export type ForwardStage = (typeof STAGES)[number];
export type ExitStage = (typeof EXIT_STAGES)[number];
export type Stage = ForwardStage | ExitStage;

export const ALL_STAGES: Stage[] = [...STAGES, ...EXIT_STAGES];

export const REJECT_REASONS = [
  "Skills mismatch",
  "Experience mismatch",
  "Failed internal interview",
  "Client rejected",
  "Notice period too long",
  "CTC expectation too high",
  "BGV failed",
  "Position closed",
] as const;

export const DROP_REASONS = [
  "Accepted another offer",
  "Counter-offer from current employer",
  "Not reachable",
  "Relocation issue",
  "Personal reasons",
  "Withdrew interest",
] as const;

export const SOURCES = ["Naukri", "LinkedIn", "Referral", "Consultancy", "Direct"] as const;
export type Source = (typeof SOURCES)[number];

// The three staffing consultancies (8.33% of annual CTC). Rename to the real ones.
export const CONSULTANCIES = ["TalentBridge Staffing", "Apex HR Partners", "Prime Search Consultants"] as const;
export const CONSULTANCY_FEE_PCT = 8.33;

export const LOCATIONS = ["Pune", "Bangalore", "Goa", "Remote"] as const;

export type Role = "head" | "recruiter" | "hiring_manager";

export const ROLE_LABEL: Record<Role, string> = {
  head: "Head of TA",
  recruiter: "Recruiter",
  hiring_manager: "Hiring Manager",
};

// DPDP Act: candidate data is retained only for a bounded period after last activity.
export const RETENTION_MONTHS = 24;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Client {
  id: string;
  name: string;
  country: string;
  domain: string; // banking / retail / logistics
}

export type JobStatus = "Open" | "On Hold" | "Closed";
export type HiringType = "Project" | "Bench";

export interface Job {
  id: string;
  code: string; // REQ-0001
  title: string;
  clientId: string | null; // null for bench hiring
  project: string;
  hiringType: HiringType;
  billingRateUsd: number | null; // per hour
  skills: string[];
  expMin: number;
  expMax: number;
  ctcMinLpa: number;
  ctcMaxLpa: number;
  location: string;
  openings: number;
  targetClosureDate: string; // yyyy-mm-dd
  status: JobStatus;
  recruiterId: string | null;
  hiringManagerId: string | null;
  createdAt: string;
  createdBy: string;
}

export interface Candidate {
  id: string;
  name: string;
  phone: string; // normalised 10-digit
  email: string;
  currentCompany: string;
  currentCtcLpa: number;
  expectedCtcLpa: number;
  noticeDays: number;
  totalExpYears: number;
  skills: string[];
  location: string;
  source: Source;
  sourceDetail: string; // consultancy name or referring employee
  consentAt: string; // DPDP consent timestamp
  retainUntil: string; // DPDP retention deadline
  createdAt: string;
  createdBy: string;
}

export interface Application {
  id: string;
  candidateId: string;
  jobId: string;
  stage: Stage;
  stageChangedAt: string;
  exitReason: string | null;
  createdAt: string;
  createdBy: string;
}

export interface StageEvent {
  id: string;
  applicationId: string;
  fromStage: Stage | null;
  toStage: Stage;
  reason: string | null;
  at: string;
  by: string;
}

export interface Note {
  id: string;
  candidateId: string;
  applicationId: string | null;
  body: string;
  authorId: string;
  at: string;
}

export interface DB {
  users: User[];
  clients: Client[];
  jobs: Job[];
  candidates: Candidate[];
  applications: Application[];
  stageEvents: StageEvent[];
  notes: Note[];
  counters: { job: number };
}

/** Normalise an Indian phone number to its last 10 digits so "+91 98220-12345" == "9822012345". */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function parseSkills(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

export function isActive(stage: Stage): boolean {
  return stage !== "Rejected" && stage !== "Dropped Out" && stage !== "Joined";
}

export function nextStage(stage: Stage): ForwardStage | null {
  const i = STAGES.indexOf(stage as ForwardStage);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1] : null;
}

export function prevStage(stage: Stage): ForwardStage | null {
  const i = STAGES.indexOf(stage as ForwardStage);
  return i > 0 ? STAGES[i - 1] : null;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Notice-period fit: can this candidate join before the job's target closure date? */
export function noticeFit(noticeDays: number, targetClosureDate: string, today = new Date()) {
  const daysLeft = daysBetween(today, new Date(targetClosureDate));
  return { daysLeft, fits: noticeDays <= Math.max(daysLeft, 0), gap: noticeDays - daysLeft };
}
