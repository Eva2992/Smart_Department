import { type ConflictDetail } from "../api/scheduleApi";

export interface ConflictAlertBadgeProps {
  isChecking?: boolean;
  hasConflict?: boolean | null;
  conflicts?: ConflictDetail[];
  summaryMessage?: string;
}

export function ConflictAlertBadge({
  isChecking = false,
  hasConflict,
  conflicts = [],
  summaryMessage,
}: ConflictAlertBadgeProps) {
  if (isChecking) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium animate-pulse">
        <div className="w-3.5 h-3.5 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin"></div>
        <span>Evaluating room, teacher &amp; batch availability in real-time...</span>
      </div>
    );
  }

  if (hasConflict === true) {
    return (
      <div
        data-testid="conflict-alert-banner"
        className="p-3.5 rounded-2xl bg-rose-50/80 border-2 border-[#E11D48] text-[#E11D48] shadow-xs space-y-2 animate-in fade-in duration-150"
      >
        <div className="flex items-center gap-2 font-bold text-xs">
          <span>❌ Conflict Detected</span>
        </div>
        {summaryMessage && (
          <p className="text-xs font-medium text-rose-800 leading-snug">{summaryMessage}</p>
        )}
        {conflicts.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-rose-200/80">
            {conflicts.map((conflict, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs text-rose-900 bg-white/70 p-2 rounded-lg border border-rose-200/60"
              >
                <span className="font-bold text-[10px] uppercase px-1.5 py-0.5 rounded bg-rose-100 text-[#E11D48] border border-rose-300">
                  {conflict.type}
                </span>
                <span className="flex-1 font-medium">{conflict.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (hasConflict === false) {
    return (
      <div
        data-testid="conflict-clear-badge"
        className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold"
      >
        <span className="text-emerald-600 text-sm font-bold">✓</span>
        <span>Slot Available — No Room, Teacher, or Batch Conflicts.</span>
      </div>
    );
  }

  return null;
}
