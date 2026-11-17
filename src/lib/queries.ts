import "server-only";
import { readDb } from "./store";
import {
  ALL_STAGES,
  CONSULTANCY_FEE_PCT,
  SOURCES,
  STAGES,
  daysBetween,
  isActive,
  normalisePhone,
  type Application,
  type Candidate,
  type Job,
  type Stage,
} from "./domain";

export function userName(id: string | null | undefined) {
  if (!id) return "Unassigned";
  return readDb().users.find((u) => u.id === id)?.name ?? "Unknown";
}

export function clientName(id: string | null) {
  if (!id) return "Bench (no client)";
  return readDb().clients.find((c) => c.id === id)?.name ?? "Unknown client";
}

export function listJobs(filter: { status?: string; q?: string; recruiterId?: string } = {}) {
  const db = readDb();
  const q = filter.q?.toLowerCase().trim();
  return db.jobs
    .filter((j) => !filter.status || filter.status === "All" || j.status === filter.status)
    .filter((j) => !filter.recruiterId || j.recruiterId === filter.recruiterId)
    .filter(
      (j) =>
        !q ||
        [j.title, j.code, j.project, clientName(j.clientId), ...j.skills].some((s) => s.toLowerCase().includes(q)),
    )
    .map((job) => {
      const apps = db.applications.filter((a) => a.jobId === job.id);
      return {
        job,
        total: apps.length,
        active: apps.filter((a) => isActive(a.stage)).length,
        joined: apps.filter((a) => a.stage === "Joined").length,
        offered: apps.filter((a) => a.stage === "Offered" || a.stage === "BGV").length,
      };
    })
    .sort((a, b) => a.job.targetClosureDate.localeCompare(b.job.targetClosureDate));
}

export function getJob(id: string) {
  const db = readDb();
  const job = db.jobs.find((j) => j.id === id);
  if (!job) return null;
  const apps = db.applications
    .filter((a) => a.jobId === id)
    .map((a) => ({ app: a, candidate: db.candidates.find((c) => c.id === a.candidateId)! }));
  return { job, apps };
}

export interface CandidateFilter {
  q?: string;
  skill?: string;
  source?: string;
  maxNotice?: number;
  minExp?: number;
  maxExp?: number;
}

export function listCandidates(f: CandidateFilter = {}) {
  const db = readDb();
  const q = f.q?.toLowerCase().trim();
  const skills = (f.skill ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return db.candidates
    .filter(
      (c) =>
        !q ||
        [c.name, c.email, c.phone, c.currentCompany].some((s) => s.toLowerCase().includes(q)) ||
        c.phone.includes(normalisePhone(q)),
    )
    .filter((c) => skills.every((s) => c.skills.some((cs) => cs.toLowerCase().includes(s))))
    .filter((c) => !f.source || c.source === f.source)
    .filter((c) => f.maxNotice === undefined || c.noticeDays <= f.maxNotice)
    .filter((c) => f.minExp === undefined || c.totalExpYears >= f.minExp)
    .filter((c) => f.maxExp === undefined || c.totalExpYears <= f.maxExp)
    .map((c) => {
      const apps = db.applications.filter((a) => a.candidateId === c.id);
      return { candidate: c, apps, activeApps: apps.filter((a) => isActive(a.stage)) };
    })
    .sort((a, b) => b.candidate.createdAt.localeCompare(a.candidate.createdAt));
}

export function getCandidate(id: string) {
  const db = readDb();
  const candidate = db.candidates.find((c) => c.id === id);
  if (!candidate) return null;
  const apps = db.applications
    .filter((a) => a.candidateId === id)
    .map((a) => ({
      app: a,
      job: db.jobs.find((j) => j.id === a.jobId)!,
      events: db.stageEvents.filter((e) => e.applicationId === a.id).sort((x, y) => y.at.localeCompare(x.at)),
    }));
  const notes = db.notes.filter((n) => n.candidateId === id).sort((a, b) => b.at.localeCompare(a.at));
  return { candidate, apps, notes };
}

/** Duplicate check: who already "owns" this person, so two recruiters never call the same candidate blind. */
export function findDuplicates(phone: string, email?: string, excludeId?: string) {
  const db = readDb();
  const p = normalisePhone(phone);
  const e = email?.trim().toLowerCase();
  return db.candidates
    .filter((c) => c.id !== excludeId)
    .filter((c) => (p.length >= 10 && c.phone === p) || (!!e && c.email.toLowerCase() === e))
    .map((c) => ({
      id: c.id,
      name: c.name,
      matchedOn: c.phone === p ? "phone" : "email",
      addedBy: userName(c.createdBy),
      addedAt: c.createdAt,
      activeApplications: db.applications
        .filter((a) => a.candidateId === c.id && isActive(a.stage))
        .map((a) => {
          const job = db.jobs.find((j) => j.id === a.jobId)!;
          return { job: `${job.code} ${job.title}`, stage: a.stage, recruiter: userName(job.recruiterId) };
        }),
    }));
}

export function dashboard() {
  const db = readDb();
  const now = new Date();
  const openJobs = db.jobs.filter((j) => j.status === "Open");
  const openPositions = openJobs.reduce((s, j) => s + j.openings, 0);

  const byStage = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  db.applications.forEach((a) => byStage[a.stage]++);

  const reached = (a: Application, stage: Stage) =>
    db.stageEvents.some((e) => e.applicationId === a.id && e.toStage === stage);

  // Offer → join funnel: of everyone who ever got an offer, how many joined vs dropped.
  const offered = db.applications.filter((a) => reached(a, "Offered"));
  const offerJoined = offered.filter((a) => a.stage === "Joined").length;
  const offerDropped = offered.filter((a) => a.stage === "Dropped Out").length;
  const offerPending = offered.length - offerJoined - offerDropped;
  const decided = offerJoined + offerDropped;

  // Source effectiveness: volume → offers → joins, plus consultancy cost.
  const candById = new Map(db.candidates.map((c) => [c.id, c]));
  const sources = SOURCES.map((source) => {
    const apps = db.applications.filter((a) => candById.get(a.candidateId)?.source === source);
    const joinedApps = apps.filter((a) => a.stage === "Joined");
    const fee =
      source === "Consultancy"
        ? joinedApps.reduce((s, a) => s + (candById.get(a.candidateId)!.expectedCtcLpa * CONSULTANCY_FEE_PCT) / 100, 0)
        : 0;
    return {
      source,
      applications: apps.length,
      interviews: apps.filter((a) => reached(a, "Internal Interview")).length,
      offers: apps.filter((a) => reached(a, "Offered")).length,
      joined: joinedApps.length,
      feeLpa: fee,
    };
  });

  // Time to fill: job created → first Joined event.
  const fills = db.jobs
    .map((j) => {
      const joinEvents = db.stageEvents.filter(
        (e) => e.toStage === "Joined" && db.applications.find((a) => a.id === e.applicationId)?.jobId === j.id,
      );
      if (!joinEvents.length) return null;
      const first = joinEvents.map((e) => e.at).sort()[0];
      return daysBetween(new Date(j.createdAt), new Date(first));
    })
    .filter((x): x is number => x !== null);
  const avgTimeToFill = fills.length ? Math.round(fills.reduce((a, b) => a + b, 0) / fills.length) : null;

  const overdue = openJobs.filter((j) => new Date(j.targetClosureDate) < now);
  const dueSoon = openJobs.filter((j) => {
    const d = daysBetween(now, new Date(j.targetClosureDate));
    return d >= 0 && d <= 14;
  });

  // Recruiter workload
  const recruiters = db.users
    .filter((u) => u.role === "recruiter")
    .map((u) => {
      const jobs = openJobs.filter((j) => j.recruiterId === u.id);
      const ids = new Set(jobs.map((j) => j.id));
      return {
        user: u,
        openJobs: jobs.length,
        activeCandidates: db.applications.filter((a) => ids.has(a.jobId) && isActive(a.stage)).length,
      };
    });

  return {
    openJobs: openJobs.length,
    openPositions,
    activeCandidates: db.applications.filter((a) => isActive(a.stage)).length,
    totalCandidates: db.candidates.length,
    byStage,
    funnel: STAGES.map((s) => ({ stage: s, count: db.applications.filter((a) => reached(a, s)).length })),
    offer: {
      total: offered.length,
      joined: offerJoined,
      dropped: offerDropped,
      pending: offerPending,
      dropRate: decided ? Math.round((offerDropped / decided) * 100) : null,
    },
    sources,
    avgTimeToFill,
    overdue,
    dueSoon,
    recruiters,
  };
}

export type JobRow = ReturnType<typeof listJobs>[number];
export type { Job, Candidate };
