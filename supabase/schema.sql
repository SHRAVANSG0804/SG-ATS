-- Meridian ATS – Supabase / Postgres schema (Phase 2 target).
-- Mirrors src/lib/domain.ts. Run in Supabase SQL editor.

create type user_role   as enum ('head', 'recruiter', 'hiring_manager');
create type job_status  as enum ('Open', 'On Hold', 'Closed');
create type hiring_type as enum ('Project', 'Bench');
create type stage as enum ('Applied','Screened','Internal Interview','Client Round','Offered','BGV','Joined','Rejected','Dropped Out');
create type source as enum ('Naukri','LinkedIn','Referral','Consultancy','Direct');

create table app_users (               -- "Recruiters" + hiring managers + head; linked to Clerk
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  name          text not null,
  email         text not null unique,
  role          user_role not null default 'recruiter',
  created_at    timestamptz not null default now()
);

create table clients (
  id      uuid primary key default gen_random_uuid(),
  name    text not null unique,
  country text,
  domain  text
);

create table consultancies (
  id      uuid primary key default gen_random_uuid(),
  name    text not null unique,
  fee_pct numeric(5,2) not null default 8.33
);

create sequence job_code_seq;
create table jobs (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique default ('REQ-' || lpad(nextval('job_code_seq')::text, 4, '0')),
  title               text not null,
  client_id           uuid references clients(id),
  project             text,
  hiring_type         hiring_type not null default 'Project',
  billing_rate_usd    numeric(8,2),
  skills              text[] not null default '{}',
  exp_min             numeric(4,1) not null,
  exp_max             numeric(4,1) not null check (exp_max >= exp_min),
  ctc_min_lpa         numeric(6,2) not null,
  ctc_max_lpa         numeric(6,2) not null check (ctc_max_lpa >= ctc_min_lpa),
  location            text not null,
  openings            int not null default 1 check (openings > 0),
  target_closure_date date not null,
  status              job_status not null default 'Open',
  recruiter_id        uuid references app_users(id),
  hiring_manager_id   uuid references app_users(id),
  created_by          uuid references app_users(id),
  created_at          timestamptz not null default now(),
  check (hiring_type = 'Bench' or client_id is not null)
);

create table candidates (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  phone            char(10) not null,          -- normalised last 10 digits
  email            text not null,
  current_company  text,
  current_ctc_lpa  numeric(6,2),
  expected_ctc_lpa numeric(6,2),
  notice_days      int not null default 30,
  total_exp_years  numeric(4,1),
  skills           text[] not null default '{}',
  location         text,
  source           source not null,
  consultancy_id   uuid references consultancies(id),
  referred_by      text,
  resume_path      text,                       -- Supabase Storage: bucket "resumes"
  consent_at       timestamptz not null,       -- DPDP consent
  retain_until     timestamptz not null,       -- DPDP retention deadline
  created_by       uuid references app_users(id),
  created_at       timestamptz not null default now()
);
create index candidates_phone_idx  on candidates (phone);   -- duplicate detection
create index candidates_email_idx  on candidates (lower(email));
create index candidates_skills_idx on candidates using gin (skills);

create table applications (
  id               uuid primary key default gen_random_uuid(),
  candidate_id     uuid not null references candidates(id) on delete cascade,
  job_id           uuid not null references jobs(id) on delete cascade,
  stage            stage not null default 'Applied',
  stage_changed_at timestamptz not null default now(),
  exit_reason      text,
  created_by       uuid references app_users(id),
  created_at       timestamptz not null default now(),
  unique (candidate_id, job_id)
);

create table stage_events (            -- full movement history with timestamps
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  from_stage     stage,
  to_stage       stage not null,
  reason         text,
  by_user        uuid references app_users(id),
  at             timestamptz not null default now()
);

create table notes (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references candidates(id) on delete cascade,
  application_id uuid references applications(id) on delete set null,
  body           text not null,
  author_id      uuid references app_users(id),
  at             timestamptz not null default now()
);

create table interviews (              -- Phase 2: scheduling with panel + client round
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id) on delete cascade,
  round          text not null,          -- 'Internal' | 'Client'
  scheduled_at   timestamptz not null,
  panel          text[] not null default '{}',
  outcome        text,
  feedback       text
);

-- DPDP: purge candidates past retention (schedule with pg_cron).
-- delete from candidates where retain_until < now();
-- Storage: create a private bucket named "resumes".
