import React, { useState, useEffect, useCallback } from "react";
import { type Holiday, getHolidays, deleteHoliday, updateHoliday } from "../api/scheduleApi";
import { useAuth } from "../context/useAuth";
import { HolidayCalendar } from "./HolidayCalendar";
import { HolidayDeclarationForm } from "./HolidayDeclarationForm";

interface HolidayManagerProps {
  userRole: string;
  onHolidayChanged?: () => void;
}

export const HolidayManager: React.FC<HolidayManagerProps> = ({
  userRole,
  onHolidayChanged,
}) => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"calendar" | "list">("calendar");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("");
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Confirmation Delete Modal state
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit Modal state
  const [holidayToEdit, setHolidayToEdit] = useState<Holiday | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editDate, setEditDate] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHolidays({
        batchId: selectedBatchFilter || undefined,
      });
      setHolidays(data);
    } catch (err: unknown) {
      console.error("Failed to load holidays:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBatchFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleDeclaredSuccess = (result: { message?: string }) => {
    setBannerMessage(`✓ ${result.message || "Holiday declared successfully."}`);
    fetchList();
    if (onHolidayChanged) {
      onHolidayChanged();
    }
  };

  const handleOpenEdit = (h: Holiday) => {
    setHolidayToEdit(h);
    setEditReason(h.reason);
    setEditDate(h.date ? h.date.split("T")[0] : "");
    setEditError(null);
  };

  const handleConfirmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayToEdit) return;
    if (!editReason.trim()) {
      setEditError("Reason is required.");
      return;
    }
    setIsEditing(true);
    setEditError(null);
    try {
      const res = await updateHoliday(holidayToEdit.id, {
        reason: editReason.trim(),
        date: editDate,
      });
      setBannerMessage(`✓ ${res.message || "Holiday updated successfully."}`);
      setHolidayToEdit(null);
      fetchList();
      if (onHolidayChanged) onHolidayChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update holiday";
      setEditError(msg);
    } finally {
      setIsEditing(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!holidayToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      const res = await deleteHoliday(holidayToDelete.id);
      setBannerMessage(`✓ ${res.message || "Holiday removed and classes restored."}`);
      setHolidayToDelete(null);
      fetchList();
      if (onHolidayChanged) {
        onHolidayChanged();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete holiday";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Top Controls: View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] p-4 rounded-2xl border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("calendar")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeView === "calendar"
                ? "bg-[#DC143C] text-white shadow-xs"
                : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>📅 Holiday Calendar View</span>
          </button>

          <button
            onClick={() => setActiveView("list")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeView === "list"
                ? "bg-[#DC143C] text-white shadow-xs"
                : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>📋 Declared Holidays List &amp; Management</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeView === "list" ? "bg-white/20 text-white" : "bg-gray-100 text-[#6B7280]"
              }`}
            >
              {holidays.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchList}
            className="text-xs font-semibold text-[#DC143C] hover:underline cursor-pointer"
          >
            🔄 Refresh List
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
          {bannerMessage}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Main View Display */}
      {activeView === "calendar" ? (
        <HolidayCalendar
          holidays={holidays}
          selectedBatchId={selectedBatchFilter}
          onBatchFilterChange={(b) => setSelectedBatchFilter(b)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Declaration Form (Admin or CR) */}
          {(isAdmin || userRole === "CR") && (
            <div>
              <HolidayDeclarationForm onSuccess={handleDeclaredSuccess} />
            </div>
          )}

          {/* Holiday List */}
          <div
            className={`${
              (isAdmin || userRole === "CR") ? "lg:col-span-2" : "lg:col-span-3"
            } bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)]`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
                  Department Academic Holidays
                </h2>
                <p className="text-xs text-[#6B7280]">
                  Active calendar closures and observed department off-days.
                </p>
              </div>
            </div>

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
                  const canModify = isAdmin || (userRole === "CR" && h.batchId === user?.batchId);
                  return (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/40 border border-amber-200 hover:border-amber-300 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F59E0B]/20 text-[#B45309] border border-[#F59E0B]/40 font-[Poppins]">
                            ★ {dateStr}
                          </span>
                          <span className="text-xs font-medium text-[#6B7280]">
                            Scope:{" "}
                            {h.scope === "ALL"
                              ? "Entire Department"
                              : `Batch ${h.batch?.name || h.batchId || "Specific"}`}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#1F2937] font-[Poppins]">
                          {h.reason}
                        </h4>
                      </div>

                      {canModify && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(h)}
                            className="py-1.5 px-3 rounded-xl text-xs font-bold text-[#1F2937] hover:bg-white border border-gray-300 transition cursor-pointer"
                          >
                            ✎ Edit
                          </button>
                          <button
                            onClick={() => setHolidayToDelete(h)}
                            className="py-1.5 px-3 rounded-xl text-xs font-bold text-[#E11D48] hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                          >
                            ✕ Remove &amp; Restore
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restoration Confirmation Modal */}
      {holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-[#E11D48] flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>

            <div>
              <h3 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
                Remove Holiday &amp; Restore Classes?
              </h3>
              <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
                Removing the holiday for{" "}
                <strong className="text-[#1F2937]">
                  {holidayToDelete.reason} (
                  {holidayToDelete.date ? holidayToDelete.date.split("T")[0] : ""})
                </strong>{" "}
                will automatically restore all previously cancelled classes back to{" "}
                <span className="font-semibold text-emerald-600">SCHEDULED</span> status.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setHolidayToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#E11D48] hover:bg-[#B91C1C] text-white shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Restoring Classes..." : "Proceed with Restoration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Holiday / Off-Day Modal */}
      {holidayToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
                Edit Holiday / Off-Day
              </h3>
              <button
                type="button"
                onClick={() => setHolidayToEdit(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
                  Holiday Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
                  Reason / Occasion
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
                />
              </div>

              {/* Error message placed immediately above submit button */}
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
                  ✕ {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setHolidayToEdit(null)}
                  disabled={isEditing}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isEditing ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
