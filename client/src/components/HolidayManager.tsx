import { useState, useEffect, useCallback } from "react";
import { type Holiday, getHolidays, declareHoliday, deleteHoliday } from "../api/scheduleApi";

interface HolidayManagerProps {
  userRole: string;
  onHolidayChanged: () => void;
}

export function HolidayManager({ userRole, onHolidayChanged }: HolidayManagerProps) {
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

      setBannerMessage(`✓ ${res.message || "Holiday declared successfully."}`);
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
      <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
          <span>★ Declare Academic Holiday</span>
        </h2>
        <p className="text-xs text-[#6B7280] mt-1 leading-relaxed">
          Declaring a holiday automatically and retroactively marks all overlapping classes on that
          date as <strong className="text-[#F59E0B]">Holiday (Cancelled)</strong>.
        </p>

        {userRole !== "ADMIN" ? (
          <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-[#6B7280]">
            🔒 Only Department Administrators hold privileges to declare or remove academic holidays
            (FR-18).
          </div>
        ) : (
          <form onSubmit={handleDeclare} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                Holiday Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                Occasion / Reason
              </label>
              <input
                type="text"
                placeholder="e.g. Eid-ul-Fitr, University Foundation Day"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                Scope
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as "ALL" | "BATCH")}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              >
                <option value="ALL">Entire Department (All Batches)</option>
                <option value="BATCH">Specific Batch</option>
              </select>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isDeclaring}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDeclaring ? "Declaring Holiday..." : "Declare Holiday"}
            </button>
          </form>
        )}
      </div>

      {/* Right Column: Existing Holidays List */}
      <div className="lg:col-span-2 bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
              Department Academic Holidays
            </h2>
            <p className="text-xs text-[#6B7280]">
              Active calendar closures and observed department off-days.
            </p>
          </div>
          <button
            onClick={fetchList}
            className="text-xs font-semibold text-[#DC143C] hover:underline"
          >
            Refresh
          </button>
        </div>

        {bannerMessage && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
            {bannerMessage}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-[#6B7280] text-xs">
              Loading declared holidays...
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-8 text-center text-[#6B7280] text-xs bg-gray-50 rounded-2xl">
              No holidays currently recorded on the departmental calendar.
            </div>
          ) : (
            holidays.map((h) => {
              const dateStr = h.date ? h.date.split("T")[0] : "";
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/40 border border-amber-200 hover:border-amber-300 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B]/20 text-[#B45309] border border-[#F59E0B]/40">
                        ★ {dateStr}
                      </span>
                      <span className="text-xs font-medium text-[#6B7280]">
                        Scope: {h.scope === "ALL" ? "Department-Wide" : "Batch Specific"}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#1F2937]">{h.reason}</h4>
                  </div>

                  {userRole === "ADMIN" && (
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="py-1.5 px-3 rounded-xl text-xs font-bold text-[#E11D48] hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                    >
                      ✕ Remove &amp; Restore
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
