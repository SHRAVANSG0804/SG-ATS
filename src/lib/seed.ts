import type { Application, Candidate, DB, Job, Note, Source, Stage, StageEvent } from "./domain";
import { CONSULTANCIES, RETENTION_MONTHS, STAGES } from "./domain";
import { hashPassword } from "./password";

/** Starting password for the seeded accounts. Everyone is asked to change it on first sign-in. */
export const DEFAULT_PASSWORD = "Meridian@2026";

/**
 * Built-in demo logins requested by the client. Short passwords are deliberate for demos;
 * the 8-character policy applies to passwords people set themselves. Remove before real use.
 */
export const DEMO_ACCOUNTS = [
  { id: "u-you1", name: "Demo Manager", email: "you1@mardian.com", role: "head" as const, password: "1223" },
  { id: "u-you2", name: "Demo Employee", email: "you2@mardian.com", role: "recruiter" as const, password: "1332" },
];

/** Adds any missing demo account (user + credential) to the database. Returns true if something was added. */
export function ensureDemoAccounts(db: Pick<DB, "users" | "credentials">): boolean {
  let added = false;
  for (const a of DEMO_ACCOUNTS) {
    if (db.users.some((u) => u.id === a.id || u.email.toLowerCase() === a.email)) continue;
    db.users.push({ id: a.id, name: a.name, email: a.email, role: a.role, active: true });
    db.credentials.push({ userId: a.id, passwordHash: hashPassword(a.password), mustChangePassword: false, updatedAt: new Date().toISOString() });
    added = true;
  }
  return added;
}

export function defaultCredentials(userIds: string[]) {
  const now = new Date().toISOString();
  return userIds.map((userId) => ({ userId, passwordHash: hashPassword(DEFAULT_PASSWORD), mustChangePassword: true, updatedAt: now }));
}

// Fictional demo data shaped like Meridian's real hiring: client-linked roles,
// bench hiring, Indian CTC/notice-period norms, and mixed sources.

const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();
const ahead = (d: number) => new Date(Date.now() + d * day).toISOString().slice(0, 10);
const addMonths = (iso: string, m: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + m);
  return d.toISOString();
};

export function buildSeed(): DB {
  const users = [
    { id: "u-head", name: "Anjali Deshpande", email: "anjali@meridian.example", role: "head" as const, active: true },
    { id: "u-r1", name: "Rohit Kulkarni", email: "rohit@meridian.example", role: "recruiter" as const, active: true },
    { id: "u-r2", name: "Sneha Iyer", email: "sneha@meridian.example", role: "recruiter" as const, active: true },
    { id: "u-r3", name: "Faisal Shaikh", email: "faisal@meridian.example", role: "recruiter" as const, active: true },
    { id: "u-r4", name: "Priya Naik", email: "priya@meridian.example", role: "recruiter" as const, active: true },
    { id: "u-hm1", name: "Vikram Joshi", email: "vikram@meridian.example", role: "hiring_manager" as const, active: true },
    { id: "u-hm2", name: "Meera Rao", email: "meera@meridian.example", role: "hiring_manager" as const, active: true },
  ];

  const clients = [
    { id: "c-1", name: "Northwind Bank (US)", country: "USA", domain: "Banking" },
    { id: "c-2", name: "Harbour Retail Group (UK)", country: "UK", domain: "Retail" },
    { id: "c-3", name: "Atlas Freight Lines (US)", country: "USA", domain: "Logistics" },
  ];

  const j = (n: number, p: Partial<Job> & Pick<Job, "title">): Job => ({
    id: `j-${n}`,
    code: `REQ-${String(n).padStart(4, "0")}`,
    clientId: "c-1",
    project: "",
    hiringType: "Project",
    billingRateUsd: 35,
    skills: [],
    expMin: 3,
    expMax: 6,
    ctcMinLpa: 8,
    ctcMaxLpa: 14,
    location: "Pune",
    openings: 1,
    targetClosureDate: ahead(21),
    status: "Open",
    recruiterId: "u-r1",
    hiringManagerId: "u-hm1",
    createdAt: ago(20),
    createdBy: "u-head",
    ...p,
  });

  const jobs: Job[] = [
    j(1, { title: "Senior Java Developer", project: "Core Banking Modernisation", skills: ["Java", "Spring Boot", "Microservices", "Kafka"], expMin: 5, expMax: 8, ctcMinLpa: 14, ctcMaxLpa: 22, openings: 3, billingRateUsd: 42, targetClosureDate: ahead(14), createdAt: ago(25) }),
    j(2, { title: "React Frontend Engineer", clientId: "c-2", project: "E-commerce Replatform", skills: ["React", "TypeScript", "Next.js"], location: "Bangalore", recruiterId: "u-r2", hiringManagerId: "u-hm2", billingRateUsd: 38, targetClosureDate: ahead(18) }),
    j(3, { title: "QA Automation Engineer", clientId: "c-3", project: "Fleet Tracking Platform", skills: ["Selenium", "Java", "REST Assured"], expMin: 2, expMax: 5, ctcMinLpa: 6, ctcMaxLpa: 11, recruiterId: "u-r3", billingRateUsd: 28, targetClosureDate: ahead(9) }),
    j(4, { title: "DevOps Engineer", clientId: "c-1", project: "Core Banking Modernisation", skills: ["AWS", "Kubernetes", "Terraform", "CI/CD"], expMin: 4, expMax: 8, ctcMinLpa: 12, ctcMaxLpa: 20, openings: 2, location: "Goa", recruiterId: "u-r4", billingRateUsd: 45, targetClosureDate: ahead(-3), createdAt: ago(40) }),
    j(5, { title: "Data Engineer", clientId: "c-2", project: "Customer 360 Analytics", skills: ["Python", "Spark", "SQL", "Azure Data Factory"], location: "Bangalore", recruiterId: "u-r2", hiringManagerId: "u-hm2", billingRateUsd: 40, targetClosureDate: ahead(30) }),
    j(6, { title: "Java Developer (Bench)", clientId: null, project: "Bench pool", hiringType: "Bench", billingRateUsd: null, skills: ["Java", "Spring Boot", "SQL"], expMin: 2, expMax: 4, ctcMinLpa: 5, ctcMaxLpa: 9, openings: 4, recruiterId: "u-r1", targetClosureDate: ahead(45) }),
    j(7, { title: ".NET Developer", clientId: "c-3", project: "Warehouse Management", skills: [".NET Core", "C#", "SQL Server"], status: "On Hold", recruiterId: "u-r3", billingRateUsd: 32 }),
    j(8, { title: "Business Analyst – Payments", clientId: "c-1", project: "Payments Gateway", skills: ["Business Analysis", "Payments", "JIRA"], expMin: 6, expMax: 10, ctcMinLpa: 15, ctcMaxLpa: 24, status: "Closed", recruiterId: "u-r4", billingRateUsd: 48, createdAt: ago(70), targetClosureDate: ahead(-30) }),
  ];

  type CandSeed = [string, string, string, number, number, number, number, string[], Source, string?];
  const cs: CandSeed[] = [
    ["Aarav Mehta", "9822010001", "Infosys", 12, 18, 60, 6, ["Java", "Spring Boot", "Microservices"], "Naukri"],
    ["Diya Kapoor", "9822010002", "TCS", 9, 14, 30, 4, ["React", "TypeScript", "Redux"], "LinkedIn"],
    ["Kabir Singh", "9822010003", "Wipro", 15, 21, 90, 7, ["Java", "Kafka", "AWS"], "Consultancy", CONSULTANCIES[0]],
    ["Ishita Rane", "9822010004", "Persistent", 7, 10, 15, 3, ["Selenium", "Java", "TestNG"], "Referral", "Rohit Kulkarni"],
    ["Vihaan Patil", "9822010005", "Capgemini", 14, 19, 30, 6, ["AWS", "Kubernetes", "Terraform"], "Naukri"],
    ["Ananya Gupta", "9822010006", "Accenture", 11, 15, 60, 5, ["Python", "Spark", "SQL"], "LinkedIn"],
    ["Reyansh Nair", "9822010007", "Freelance", 6, 9, 0, 3, ["Java", "Spring Boot", "SQL"], "Direct"],
    ["Saanvi Jain", "9822010008", "LTIMindtree", 13, 18, 45, 6, ["Java", "Microservices", "Docker"], "Consultancy", CONSULTANCIES[1]],
    ["Arjun Reddy", "9822010009", "HCL", 10, 14, 30, 5, ["React", "Next.js", "Node.js"], "Referral", "Sneha Iyer"],
    ["Myra Fernandes", "9822010010", "Cognizant", 8, 12, 60, 4, ["Selenium", "REST Assured", "Java"], "Naukri"],
    ["Advik Chavan", "9822010011", "Tech Mahindra", 16, 22, 90, 8, ["AWS", "CI/CD", "Terraform"], "Consultancy", CONSULTANCIES[2]],
    ["Kiara Bose", "9822010012", "Mphasis", 12, 16, 30, 5, ["Python", "Azure Data Factory", "SQL"], "LinkedIn"],
    ["Ayaan Khan", "9822010013", "Zensar", 5, 8, 15, 2, ["Java", "SQL"], "Naukri"],
    ["Navya Pillai", "9822010014", "Deloitte", 18, 25, 60, 9, ["Business Analysis", "Payments", "JIRA"], "Referral", "Priya Naik"],
    ["Krish Malhotra", "9822010015", "Infosys", 13, 19, 30, 6, ["Java", "Spring Boot", "Kafka"], "LinkedIn"],
    ["Aadhya Sawant", "9822010016", "TCS", 9, 13, 30, 4, ["React", "TypeScript"], "Consultancy", CONSULTANCIES[0]],
    ["Shaurya Verma", "9822010017", "Wipro", 11, 15, 60, 5, ["Kubernetes", "AWS", "Linux"], "Naukri"],
    ["Pari Desai", "9822010018", "Startup", 7, 11, 0, 3, ["Python", "SQL", "Airflow"], "Direct"],
    ["Rudra Thakur", "9822010019", "Hexaware", 12, 17, 45, 5, ["Selenium", "Cypress", "Java"], "LinkedIn"],
    ["Anika Menon", "9822010020", "Capgemini", 14, 20, 90, 7, ["Java", "Microservices", "AWS"], "Naukri"],
  ];

  const candidates: Candidate[] = cs.map(([name, phone, company, cur, exp, notice, yrs, skills, source, detail], i) => {
    const createdAt = ago(30 - i);
    return {
      id: `cand-${i + 1}`,
      name,
      phone,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@mail.example`,
      currentCompany: company,
      currentCtcLpa: cur,
      expectedCtcLpa: exp,
      noticeDays: notice,
      totalExpYears: yrs,
      skills,
      location: ["Pune", "Bangalore", "Goa"][i % 3],
      source,
      sourceDetail: detail ?? "",
      consentAt: createdAt,
      retainUntil: addMonths(createdAt, RETENTION_MONTHS),
      createdAt,
      createdBy: ["u-r1", "u-r2", "u-r3", "u-r4"][i % 4],
    };
  });

  // [candidateIdx, jobIdx, finalStage, exitReason?, daysAgoStarted]
  type AppSeed = [number, number, Stage, string | null, number];
  const as: AppSeed[] = [
    [1, 1, "Client Round", null, 18],
    [3, 1, "Internal Interview", null, 12],
    [8, 1, "Offered", null, 22],
    [15, 1, "Screened", null, 5],
    [20, 1, "Rejected", "Notice period too long", 15],
    [2, 2, "Offered", null, 16],
    [9, 2, "Client Round", null, 10],
    [16, 2, "Applied", null, 2],
    [4, 3, "BGV", null, 20],
    [10, 3, "Internal Interview", null, 8],
    [19, 3, "Screened", null, 4],
    [5, 4, "Joined", null, 38],
    [11, 4, "Dropped Out", "Accepted another offer", 30],
    [17, 4, "Client Round", null, 14],
    [6, 5, "Screened", null, 6],
    [12, 5, "Internal Interview", null, 9],
    [18, 5, "Applied", null, 1],
    [7, 6, "Joined", null, 25],
    [13, 6, "Offered", null, 12],
    [1, 6, "Screened", null, 7],
    [14, 8, "Joined", null, 60],
    [15, 4, "Dropped Out", "Counter-offer from current employer", 28],
    [3, 4, "Rejected", "Client rejected", 26],
  ];

  const applications: Application[] = [];
  const stageEvents: StageEvent[] = [];
  as.forEach(([ci, ji, finalStage, reason, start], n) => {
    const cand = candidates[ci - 1];
    const job = jobs[ji - 1];
    const id = `app-${n + 1}`;
    const by = job.recruiterId ?? "u-r1";
    // Walk the pipeline to the final stage, spacing events across the elapsed days.
    const path: Stage[] = [];
    if (finalStage === "Rejected" || finalStage === "Dropped Out") {
      const stop = finalStage === "Dropped Out" ? 4 : 2; // dropped late (at offer), rejected mid-way
      path.push(...STAGES.slice(0, stop + 1), finalStage);
    } else {
      path.push(...STAGES.slice(0, STAGES.indexOf(finalStage) + 1));
    }
    const step = Math.max(1, Math.floor(start / path.length));
    let prev: Stage | null = null;
    path.forEach((stage, k) => {
      stageEvents.push({
        id: `ev-${n + 1}-${k}`,
        applicationId: id,
        fromStage: prev,
        toStage: stage,
        reason: stage === finalStage ? reason : null,
        at: ago(start - k * step),
        by,
      });
      prev = stage;
    });
    applications.push({
      id,
      candidateId: cand.id,
      jobId: job.id,
      stage: finalStage,
      stageChangedAt: stageEvents[stageEvents.length - 1].at,
      exitReason: reason,
      createdAt: ago(start),
      createdBy: by,
    });
  });

  const notes: Note[] = [
    { id: "n-1", candidateId: "cand-8", applicationId: "app-3", body: "Holding an offer from Persistent at 17 LPA. Wants answer by Friday. High drop risk – escalate to Anjali.", authorId: "u-r1", at: ago(2) },
    { id: "n-2", candidateId: "cand-1", applicationId: "app-1", body: "Client round scheduled with Northwind panel. Candidate asked about hybrid policy.", authorId: "u-r1", at: ago(1) },
    { id: "n-3", candidateId: "cand-3", applicationId: null, body: "Notice is 90 days but says buy-out possible up to 45 days. Confirm with HR.", authorId: "u-r3", at: ago(4) },
  ];

  const seeded = { users: [...users] as DB["users"], credentials: defaultCredentials(users.map((u) => u.id)) };
  ensureDemoAccounts(seeded);
  return { users: seeded.users, credentials: seeded.credentials, sessions: [], clients, jobs, candidates, applications, stageEvents, notes, counters: { job: jobs.length } };
}
