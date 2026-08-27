import { useState, useEffect, useCallback } from "react";
import { type Holiday, getHolidays, declareHoliday, deleteHoliday } from "../api/scheduleApi";

interface HolidayManagerProps {
  userRole: string;
  onHolidayChanged: () => void;
}

export function HolidayManager({
  userRole,
  onHolidayChanged,
}: HolidayManagerProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"ALL" | "BATCH">("ALL");
  const [isDeclaring, setIsDeclaring] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolidays();
      setHolidays(data);
    } catch (err: unknown) {
      console.error("Failed to load holidays:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDeclare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsDeclaring(true);
    setError(null);
    setBannerMessage(null);

    try {
      const res = await declareHoliday({
        date,
        reason: reason.trim(),
        scope,
      });

      setBannerMessage(
        `✓ ${res.message || "Holiday declared successfully."}`
      );
      setReason("");
      fetchList();
      onHolidayChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to declare holiday";
      setError(msg);
    } finally {
      setIsDeclaring(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this holiday and restore scheduled classes?")) {
      return;
    }

    try {
      const res = await deleteHoliday(id);
      setBannerMessage(`✓ ${res.message || "Holiday removed and classes restored."}`);
      fetchList();
      onHolidayChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete holiday";
      setError(msg);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Declaration Form (Admin only) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>★ Declare Academic Holiday</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Declaring a holiday automatically and retroactively marks all overlapping classes on that
          date as <strong>Holiday (Cancelled)</strong>.
        </p>

        {userRole !== "ADMIN" ? (
          <div className="mt-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700 text-xs text-slate-400">
            🔒 Only Department Administrators hold privileges to declare or remove academic
            holidays (FR-18).
          </div>
        ) : (
          <form onSubmit={handleDeclare} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Holiday Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Occasion / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Independence Day, Eid-ul-Fitr, University Day"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "ALL" | "BATCH")}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Batches (Department-wide)</option>
                <option value="BATCH">Single Batch Only</option>
              </select>
            </div>

            {error && (
              <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isDeclaring}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
            >
              {isDeclaring ? "Declaring..." : "Declare Holiday"}
            </button>
          </form>
        )}
      </div>

      {/* Right Column: List of Holidays */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl">
        <h2 className="text-lg font-bold text-white flex items-center justify-between pb-4 border-b border-slate-800">
          <span className="flex items-center gap-2">
            <span>📅 Declared Holidays & Off-Days</span>
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold">
            {holidays.length} Total
          </span>
        </h2>

        {bannerMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center justify-between">
            <span>{bannerMessage}</span>
            <button onClick={() => setBannerMessage(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs">Loading holiday calendar...</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No holidays currently recorded in the academic calendar.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-slate-800/80">
            {holidays.map((h) => (
              <div key={h.id} className="py-3.5 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{h.reason}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800">
                      {h.scope === "ALL" ? "Department-wide" : `Batch ${h.batch?.name || ""}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Date: <strong className="text-slate-200">{h.date.split("T")[0]}</strong>
                  </p>
                </div>

                {userRole === "ADMIN" && (
                  <button
                    onClick={() => handleDelete(h.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 transition"
                  >
                    ✕ Remove & Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
