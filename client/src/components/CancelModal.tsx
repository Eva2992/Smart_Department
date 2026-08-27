import { useState } from "react";
import { type ScheduleEntry, cancelClass } from "../api/scheduleApi";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ScheduleEntry | null;
  onSuccess: () => void;
}

export function CancelModal({
  isOpen,
  onClose,
  entry,
  onSuccess,
}: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await cancelClass(entry.id, { reason: reason.trim() || undefined });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel class";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h2 className="text-xl font-bold text-rose-400 flex items-center gap-2">
            <span>⚠️ Cancel Class Slot</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to cancel the scheduled class for{" "}
            <span className="font-semibold text-white">
              {entry.course?.code || "Class"} ({entry.course?.name || "General"})
            </span>{" "}
            on{" "}
            <span className="font-semibold text-white">
              {entry.date ? entry.date.split("T")[0] : ""}
            </span>
            ?
          </p>

          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 text-xs">
            📢 <strong>Notice:</strong> Cancelling this class will instantly free up{" "}
            <strong>{entry.room?.roomNumber || "the room"}</strong> for other bookings and notify
            all enrolled students in <strong>{entry.batch?.name || "the batch"}</strong>.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Instructor unwell, urgent faculty meeting"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-sm"
            />
          </div>

          {error && (
            <div className="p-2 rounded-lg bg-rose-900/50 border border-rose-700 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
