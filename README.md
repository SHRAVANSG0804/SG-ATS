# Meridian ATS

Applicant Tracking System for **Meridian Technologies Pvt. Ltd.** (IT services, Pune / Bangalore / Goa).
It replaces four recruiter Excel files with one live system built around client-linked hiring.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Data is stored in `.data/db.json` and seeded on first run. No external keys are needed.

## Signing in

Everyone signs in with **their own work email and password**.

| Seeded account | Role |
|---|---|
| anjali@meridian.example | Head of TA (can manage the team) |
| rohit@ / sneha@ / faisal@ / priya@meridian.example | Recruiters |
| vikram@ / meera@meridian.example | Hiring managers |

Starting password for all seeded accounts: `Meridian@2026`. Each user is prompted to change it.
**Change these before any real use / deployment.**

- **Team page** (Head of TA): create accounts for new recruiters and hiring managers with their email and a temporary password
  (typed or auto-generated), change roles, reset passwords, deactivate/reactivate access.
- **Account switcher** (sidebar, bottom): stay signed in to up to 5 accounts in one browser, switch between them
  without re-typing passwords, add another account, sign out of one or all.
- **Account & password**: every user can change their own password (8+ chars, letter + number).

Security: passwords hashed with scrypt; session tokens are random, stored only as SHA-256 hashes, in httpOnly/SameSite cookies
(Secure in production), expire after 7 days; 5 failed sign-ins lock that email for 15 minutes; changing or resetting a password
signs that account out on other devices; deactivating a user ends their sessions immediately.

## The problem (from the client brief)

| Pain | What the ATS does |
|---|---|
| Two recruiters called the same candidate on the same day | Live duplicate check on phone/email while typing, showing **who owns the candidate and at which stage**; server blocks the save unless confirmed |
| 1.5 days to answer a client's "status of the Java role?" | Job page shows the whole pipeline by stage; jobs list searchable by client / project / skill |
| "I think we lose a third between offer and joining" | Dashboard **offer drop-out rate** with drop-out reason codes |
| Notice period decides everything | Every candidate card is flagged red when notice > days left until the job's target closure |
| Which source actually works? | Source effectiveness: volume → interviews → offers → joins, plus consultancy fees (8.33%) |
| DPDP Act | Consent is mandatory on create; retention deadline (12 months) stored per candidate |

## Scope delivered (Phase 1)

**Must have — all done:** job requisition (client, project, billing rate, bench/project, skills, exp band, CTC range, location, target date) ·
candidate record · applications (one candidate → many jobs) · pipeline Applied → Screened → Internal Interview → Client Round → Offered → BGV → Joined, plus Rejected / Dropped Out ·
stage movement forward/back with timestamped history · duplicate detection · notes with author & time · source tracking incl. consultancy name / referrer.

**Should have — done:** skill-based search & filters (skills, notice, experience, source) · recruiter assignment per job · reject/drop reason codes · basic dashboard (open positions, stage funnel, time-to-fill, overdue roles, recruiter workload).

**Roles & access:** email + password sign-in for every user · multi-account switcher · team management by Head of TA.
Head of TA & Recruiters edit; Hiring Managers are read-only but can add notes.

## Roadmap

| Phase | Items |
|---|---|
| 2 – Platform | Optional: move sign-in to Clerk or Supabase Auth (adds email-based password reset) · Supabase Postgres (`supabase/schema.sql` ready) · resume upload to Supabase Storage bucket `resumes` · deploy to Vercel |
| 3 – Workflow | Interview scheduling (panel, time, client round) · offer details (offered CTC, joining date) · email from app via Resend (application confirmation, interview invite) |
| 4 – Could have | Candidate self-service portal · email templates · consultancy commission report · client-facing status report · bulk resume import · offer-drop risk flag · audit log · DPDP auto-purge |
| Won't have (v1) | Payroll · onboarding · performance management · AI features |

## Architecture

```
Browser → Next.js 15 (App Router, Server Actions) → data layer (src/lib/store.ts)
                                                     ├─ Phase 1: JSON file (.data/)
                                                     └─ Phase 2: Supabase Postgres + Storage
Auth: email + password, server sessions (built in)   Email: Resend (Phase 3)   Hosting: Vercel
```

Key files: `src/lib/domain.ts` (types & business rules), `src/lib/queries.ts` (reads, dashboard maths),
`src/lib/actions.ts` (all writes, validation, duplicate guard), `supabase/schema.sql` (production schema).

## Success criteria

1. A recruiter cannot create a duplicate candidate without seeing who already owns them.
2. Head of TA can answer "status of role X" in under 1 minute.
3. Offer → join drop-out rate and source yield are visible without spreadsheets.
4. Every stage change is timestamped with who made it.

## Note on deployment

The Phase 1 file store is for local use only: Vercel's filesystem is read-only, so Supabase (Phase 2) must be wired in before deploying.
