import Link from "next/link";

const FEATURES = [
  { t: "One source of truth", d: "Replaces four Excel files. Every recruiter sees the same pipeline, live." },
  { t: "Duplicate guard", d: "Warns the moment a phone number or email already exists – and who is working that candidate." },
  { t: "Client-linked requisitions", d: "Every role carries its client, project, billing rate and target closure date." },
  { t: "Notice-period fit", d: "Flags candidates who can't join before the project needs them." },
  { t: "Offer → join tracking", d: "Measure the real drop-out rate between offer and joining, with reasons." },
  { t: "Source ROI", d: "Naukri vs LinkedIn vs referrals vs consultancies – volume, offers, joins and fees." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-sm font-bold">M</span>
          <span className="font-semibold">Meridian ATS</span>
        </div>
        <Link href="/login" className="btn-primary">
          Sign in →
        </Link>
      </header>
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-20">
        <p className="text-sm font-medium text-brand-100">Meridian Technologies · Talent Acquisition</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Staff client projects in three weeks — without losing candidates between offer and joining.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          A single applicant tracking system for recruiters, hiring managers and TA leadership across Pune, Bangalore and Goa.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/dashboard" className="btn-primary px-5 py-2.5">Go to dashboard</Link>
          <Link href="/jobs" className="btn rounded-lg border border-white/20 px-5 py-2.5 text-white hover:bg-white/10">View open jobs</Link>
        </div>
      </section>
      <section className="bg-white py-16 text-slate-900">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="card p-6">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.d}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-6xl px-6 text-xs text-slate-500">
          Candidate data is processed with recorded consent and retained for a limited period, in line with the Digital Personal Data Protection Act, 2023.
        </p>
      </section>
    </div>
  );
}
