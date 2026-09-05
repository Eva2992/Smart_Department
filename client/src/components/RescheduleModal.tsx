import { useState, useEffect } from "react";
import {
  type ScheduleEntry,
  type ConflictCheckResponse,
  type SuggestedSlotsResult,
  checkConflict,
  rescheduleClass,
  updateClassTime,
  getSuggestedSlots,
} from "../api/scheduleApi";
import { ConflictAlertBadge } from "./ConflictAlertBadge";

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ScheduleEntry | null;
  rooms: Array<{ id: string; roomNumber: string; type: string }>;
  onSuccess: () => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  entry,
  rooms,
  onSuccess,
}: RescheduleModalProps) {
  const [tab, setTab] = useState<"time" | "reschedule">("reschedule");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [roomId, setRoomId] = useState("");
  const [reason, setReason] = useState("");

  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Suggested Slots state (FR-19)
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlotsResult | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Initialize/sync when entry changes
  useEffect(() => {
    if (entry) {
      const initialDate = entry.date
        ? entry.date.split("T")[0]
        : new Date().toISOString().split("T")[0];
      const initialStartTime =
        typeof entry.startTime === "string" && entry.startTime.includes("T")
          ? new Date(entry.startTime).toISOString().substring(11, 16)
          : typeof entry.startTime === "string"
            ? entry.startTime.substring(0, 5)
            : "09:00";
      const initialEndTime =
        typeof entry.endTime === "string" && entry.endTime.includes("T")
          ? new Date(entry.endTime).toISOString().substring(11, 16)
          : typeof entry.endTime === "string"
            ? entry.endTime.substring(0, 5)
            : "10:30";

      setDate(initialDate);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setRoomId(entry.roomId || (rooms[0]?.id ?? ""));
      setReason("");
      setConflictResult(null);
      setSubmitError(null);
      setTab("reschedule");
      setSuggestedSlots(null);
    }
  }, [entry, rooms]);

  // Fetch suggested slots when in reschedule tab and date is set
  useEffect(() => {
    if (!isOpen || !entry || tab !== "reschedule" || !date) return;

    let isMounted = true;
    setLoadingSuggestions(true);

    if (typeof getSuggestedSlots === "function") {
      try {
        const promise = getSuggestedSlots(entry.id, date);
        if (promise && typeof promise.then === "function") {
          promise
            .then((res) => {
              if (isMounted && res) setSuggestedSlots(res);
            })
            .catch((err) => {
              console.error("Failed to load suggested slots:", err);
            })
            .finally(() => {
              if (isMounted) setLoadingSuggestions(false);
            });
        } else {
          if (isMounted) setLoadingSuggestions(false);
        }
      } catch (err) {
        console.error("Failed to invoke getSuggestedSlots:", err);
        if (isMounted) setLoadingSuggestions(false);
      }
    } else {
      setLoadingSuggestions(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, entry, tab, date]);

  // Debounced live conflict checking
  useEffect(() => {
    const targetDate = tab === "time" ? (entry?.date ? entry.date.split("T")[0] : date) : date;
    const targetRoomId = tab === "time" ? entry?.roomId || roomId : roomId;

    if (!isOpen || !entry || !targetDate || !startTime || !endTime || !targetRoomId) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingConflict(true);
      try {
        const result = await checkConflict({
          date: targetDate,
          startTime,
          endTime,
          roomId: targetRoomId,
          teacherId: entry.teacherId,
          batchId: entry.batchId,
          excludeScheduleEntryId: entry.id,
        });
        setConflictResult(result);
      } catch (err: unknown) {
        console.error("Conflict check error:", err);
      } finally {
        setIsCheckingConflict(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isOpen, tab, date, startTime, endTime, roomId, entry]);

  if (!isOpen || !entry) return null;

  const handleSelectSuggestedSlot = (
    slotStartTime: string,
    slotEndTime: string,
    firstRoomId?: string
  ) => {
    setStartTime(slotStartTime);
    setEndTime(slotEndTime);
    if (firstRoomId) {
      setRoomId(firstRoomId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictResult?.hasConflict) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (tab === "time") {
        // FR-16: Same-Day Class Time Update
        await updateClassTime(entry.id, {
          startTime,
          endTime,
          reason: reason.trim() || undefined,
        });
      } else {
        // FR-19: Class Reassignment to Another Day
        await rescheduleClass(entry.id, {
          date,
          startTime,
          endTime,
          roomId,
          reason: reason.trim() || undefined,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update schedule";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const originalDate = entry.date ? entry.date.split("T")[0] : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl max-w-lg w-full p-6 text-[#1F2937] shadow-[0_10px_25px_rgba(0,0,0,0.1)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
              <span>🔄 Class Update &amp; Reschedule</span>
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              {entry.course?.code || "Class"} - {entry.course?.name || "General"} (
              {entry.batch?.name || "Batch"})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1F2937] p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mt-4 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTab("time");
              setDate(originalDate);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === "time"
                ? "bg-white text-[#DC143C] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
          >
            🕒 Same-Day Time (FR-16)
          </button>
          <button
            type="button"
            onClick={() => setTab("reschedule")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              tab === "reschedule"
                ? "bg-white text-[#DC143C] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
          >
            📅 Another Day (FR-19)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {tab === "time" ? (
            /* FR-16: Same-Day Information Banner */
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
              📌 <strong>Same-Day Adjustment:</strong> Updating time for{" "}
              <strong>{originalDate}</strong> in current room{" "}
              <strong>{entry.room?.roomNumber || "TBD"}</strong>. 3-way conflict checks ensure no
              room, teacher, or batch clashes.
            </div>
          ) : (
            /* FR-19: Date Picker */
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                Target Reassignment Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              />
            </div>
          )}

          {/* FR-19: Automated Slot/Room Suggestions */}
          {tab === "reschedule" && (
            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F2937] flex items-center gap-1.5">
                  <span>💡 Suggested Department Slots</span>
                  {loadingSuggestions && (
                    <span className="text-[10px] text-[#6B7280] font-normal animate-pulse">
                      (Checking...)
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-[#6B7280]">Click slot to apply</span>
              </div>

              {suggestedSlots?.isHoliday ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  ⚠️ {suggestedSlots.holidayReason || "Selected date is a declared holiday."}
                </div>
              ) : suggestedSlots?.slots ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedSlots.slots.map((slot) => {
                    const isSelected = startTime === slot.startTime && endTime === slot.endTime;
                    return (
                      <button
                        key={slot.startTime}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() =>
                          handleSelectSuggestedSlot(
                            slot.startTime,
                            slot.endTime,
                            slot.availableRooms[0]?.id
                          )
                        }
                        className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer ${
                          isSelected
                            ? "border-[#DC143C] bg-rose-50/60 ring-1 ring-[#DC143C]"
                            : slot.isAvailable
                              ? "border-emerald-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
                              : "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{slot.label}</span>
                          {slot.isAvailable ? (
                            <span className="text-[10px] font-bold text-[#16A34A] bg-emerald-100 px-1.5 py-0.5 rounded-md">
                              ✓ Free
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#E11D48] bg-rose-100 px-1.5 py-0.5 rounded-md">
                              Busy
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#6B7280] mt-1">
                          {slot.isAvailable
                            ? `${slot.availableRooms.length} room${slot.availableRooms.length > 1 ? "s" : ""} free (${slot.availableRooms
                                .map((r) => r.roomNumber)
                                .slice(0, 3)
                                .join(", ")})`
                            : slot.reason || "Slot occupied"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280]">
                  Select date above to evaluate available slots.
                </p>
              )}
            </div>
          )}

          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              />
            </div>
          </div>

          {/* Room Selector (Only for Reschedule Tab) */}
          {tab === "reschedule" && (
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
                Target Room
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} ({r.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
              Reason (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Adjusted due to faculty schedule or exam session..."
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm resize-none"
            ></textarea>
          </div>

          {/* Live Conflict Feedback */}
          <ConflictAlertBadge
            isChecking={isCheckingConflict}
            hasConflict={conflictResult?.hasConflict}
            conflicts={conflictResult?.conflicts}
            summaryMessage={conflictResult?.summaryMessage}
          />

          {/* Submit Error */}
          {submitError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
              {submitError}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingConflict || Boolean(conflictResult?.hasConflict)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                conflictResult?.hasConflict || isCheckingConflict
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs"
              }`}
            >
              {isSubmitting
                ? "Saving..."
                : tab === "time"
                  ? "Confirm Time Update"
                  : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
