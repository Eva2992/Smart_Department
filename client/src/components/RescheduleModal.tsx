import { useState, useEffect } from "react";
import {
  type ScheduleEntry,
  checkConflict,
  rescheduleClass,
  type ConflictCheckResponse,
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
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [roomId, setRoomId] = useState("");
  const [reason, setReason] = useState("");

  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    }
  }, [entry, rooms]);

  // Debounced live conflict checking
  useEffect(() => {
    if (!isOpen || !entry || !date || !startTime || !endTime || !roomId) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingConflict(true);
      try {
        const result = await checkConflict({
          date,
          startTime,
          endTime,
          roomId,
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
  }, [isOpen, date, startTime, endTime, roomId, entry]);

  if (!isOpen || !entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (conflictResult?.hasConflict) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await rescheduleClass(entry.id, {
        date,
        startTime,
        endTime,
        roomId,
        reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reschedule class";
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl max-w-lg w-full p-6 text-[#1F2937] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
              <span>📅 Reschedule Class</span>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
              New Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
            />
          </div>

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

          {/* Room Selector */}
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
              Target Room (8 Fixed Facilities)
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

          {/* Reschedule Reason */}
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
              Reason for Rescheduling (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lab equipment maintenance, Faculty makeup session..."
              rows={2}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm resize-none"
            ></textarea>
          </div>

          {/* Live Conflict Feedback using ConflictAlertBadge */}
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
              {isSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
