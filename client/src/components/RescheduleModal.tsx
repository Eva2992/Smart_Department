import { useState, useEffect } from "react";
import {
  type ScheduleEntry,
  checkConflict,
  rescheduleClass,
  type ConflictCheckResponse,
} from "../api/scheduleApi";

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
      const initialDate = entry.date ? entry.date.split("T")[0] : new Date().toISOString().split("T")[0];
      const initialStartTime = typeof entry.startTime === "string" && entry.startTime.includes("T")
        ? new Date(entry.startTime).toISOString().substring(11, 16)
        : typeof entry.startTime === "string"
        ? entry.startTime.substring(0, 5)
        : "09:00";
      const initialEndTime = typeof entry.endTime === "string" && entry.endTime.includes("T")
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📅 Reschedule Class</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {entry.course?.code || "Class"} - {entry.course?.name || "General"} ({entry.batch?.name || "Batch"})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              New Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Room Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Target Room (8 Fixed Facilities)
            </label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
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
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Reason for Reschedule (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Faculty conference, lab equipment maintenance"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Live Conflict Validation Status Badge */}
          <div className="pt-2">
            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
              <span>3-Way Conflict Engine Validation</span>
              {isCheckingConflict && (
                <span className="text-indigo-400 animate-pulse text-xs">Evaluating...</span>
              )}
            </div>

            {isCheckingConflict ? (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-sm flex items-center gap-2">
                <span className="animate-spin">⏳</span> Checking room, teacher & batch availability...
              </div>
            ) : conflictResult?.hasConflict ? (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-700/80 text-rose-200 text-sm space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <span>❌ Conflict Detected</span>
                </div>
                <ul className="text-xs list-disc list-inside space-y-1 mt-1 text-rose-200/90">
                  {conflictResult.conflicts.map((c, i) => (
                    <li key={i}>
                      <span className="font-semibold text-rose-100">[{c.type} CONFLICT]:</span> {c.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : conflictResult && !conflictResult.hasConflict ? (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700/80 text-emerald-200 text-sm flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Slot Available — No Room, Teacher, or Batch Conflicts.</span>
              </div>
            ) : null}
          </div>

          {submitError && (
            <div className="p-2 rounded-lg bg-rose-900/50 border border-rose-700 text-rose-300 text-xs">
              {submitError}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingConflict || !!conflictResult?.hasConflict}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                conflictResult?.hasConflict || isCheckingConflict || isSubmitting
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30"
              }`}
            >
              {isSubmitting ? "Updating..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
