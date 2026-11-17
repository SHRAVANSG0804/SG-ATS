import { moveStage } from "@/lib/actions";
import { DROP_REASONS, REJECT_REASONS, STAGES, nextStage, prevStage, type Stage } from "@/lib/domain";

/** Move an application forward/back, jump to any stage, or exit with a reason code. Works without client JS. */
export function StageControls({ applicationId, stage, compact = false }: { applicationId: string; stage: Stage; compact?: boolean }) {
  const prev = prevStage(stage);
  const next = nextStage(stage);
  const exited = stage === "Rejected" || stage === "Dropped Out";

  const Move = ({ to, label, cls }: { to: Stage; label: string; cls: string }) => (
    <form action={moveStage}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="toStage" value={to} />
      <button className={cls} title={`Move to ${to}`}>{label}</button>
    </form>
  );

  return (
    <div className="flex flex-wrap items-center gap-1">
      {prev && <Move to={prev} label="←" cls="btn-ghost border border-slate-200 text-xs" />}
      {next && <Move to={next} label={compact ? "→" : `${next} →`} cls="btn-ghost border border-brand-100 bg-brand-50 text-xs text-brand-700 hover:bg-brand-100" />}

      {!compact && (
        <form action={moveStage} className="flex items-center gap-1">
          <input type="hidden" name="applicationId" value={applicationId} />
          <select name="toStage" defaultValue="" className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs" required>
            <option value="" disabled>{exited ? "Reopen at…" : "Move to…"}</option>
            {STAGES.filter((s) => s !== stage).map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn-ghost border border-slate-200 text-xs">Go</button>
        </form>
      )}

      {!exited && stage !== "Joined" && (
        <details className={compact ? "min-w-0 open:basis-full" : "relative"}>
          <summary className="btn-ghost cursor-pointer list-none border border-rose-100 text-xs text-rose-600 hover:bg-rose-50">✕</summary>
          <div className={`${compact ? "mt-2 w-full min-w-0" : "absolute right-0 z-20 mt-1 w-64 shadow-lg"} space-y-3 rounded-lg border border-slate-200 bg-white p-3`}>
            {(
              [
                ["Rejected", REJECT_REASONS],
                ["Dropped Out", DROP_REASONS],
              ] as const
            ).map(([to, reasons]) => (
              <form key={to} action={moveStage} className="space-y-1.5">
                <input type="hidden" name="applicationId" value={applicationId} />
                <input type="hidden" name="toStage" value={to} />
                <div className="text-xs font-semibold text-slate-700">{to === "Rejected" ? "Reject (our decision)" : "Dropped out (candidate's decision)"}</div>
                <div className="flex gap-1">
                  <select name="reason" required defaultValue="" className="min-w-0 flex-1 rounded-md border border-slate-200 px-1.5 py-1 text-xs">
                    <option value="" disabled>Reason…</option>
                    {reasons.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button className="rounded-md bg-rose-600 px-2 text-xs font-medium text-white hover:bg-rose-700">OK</button>
                </div>
              </form>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
