import type { Stage } from "@/lib/domain";

const STAGE_STYLE: Record<Stage, string> = {
  Applied: "bg-slate-100 text-slate-700",
  Screened: "bg-sky-100 text-sky-800",
  "Internal Interview": "bg-indigo-100 text-indigo-800",
  "Client Round": "bg-violet-100 text-violet-800",
  Offered: "bg-amber-100 text-amber-800",
  BGV: "bg-orange-100 text-orange-800",
  Joined: "bg-emerald-100 text-emerald-800",
  Rejected: "bg-rose-100 text-rose-700",
  "Dropped Out": "bg-zinc-200 text-zinc-700",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STAGE_STYLE[stage]}`}>
      {stage}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "green" | "amber" | "red" | "blue" }) {
  const t = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-700",
    blue: "bg-brand-50 text-brand-700",
  }[tone];
  return <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${t}`}>{children}</span>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "red" | "green" }) {
  const color = tone === "red" ? "text-rose-600" : tone === "green" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="card p-5">
      <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</div>
      <div className={`mt-2 text-3xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function SkillTags({ skills, highlight = [] }: { skills: string[]; highlight?: string[] }) {
  const h = new Set(highlight.map((s) => s.toLowerCase()));
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s) => (
        <span
          key={s}
          className={`rounded px-1.5 py-0.5 text-xs ${h.has(s.toLowerCase()) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{children}</div>;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const fmtLpa = (n: number) => `₹${n % 1 === 0 ? n : n.toFixed(1)} L`;

export function relDays(iso: string) {
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}
