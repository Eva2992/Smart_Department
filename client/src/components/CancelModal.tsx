import { useState } from "react";
import { type ScheduleEntry, cancelClass } from "../api/scheduleApi";

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ScheduleEntry | null;
  onSuccess: () => void;
}

export function CancelModal({ isOpen, onClose, entry, onSuccess }: CancelModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl max-w-md w-full p-6 text-[#1F2937] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-[#E11D48] flex items-center gap-2 font-[Poppins]">
            <span>⚠️ Cancel Class Slot</span>
          </h2>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1F2937] p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-[#1F2937]">
            Are you sure you want to cancel the scheduled class for{" "}
            <span className="font-bold text-[#DC143C]">
              {entry.course?.code || "Class"} ({entry.course?.name || "General"})
            </span>{" "}
            on{" "}
            <span className="font-semibold text-[#1F2937]">
              {entry.date ? entry.date.split("T")[0] : ""}
            </span>
            ?
          </p>

          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 text-xs leading-relaxed">
            📢 <strong>Notice:</strong> Cancelling this class will instantly free up{" "}
            <strong>{entry.room?.roomNumber || "the room"}</strong> for other bookings and notify
            all enrolled students in <strong>{entry.batch?.name || "the batch"}</strong>.
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Instructor unwell, urgent faculty meeting"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#E11D48] focus:ring-1 focus:ring-[#E11D48] text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-100 transition cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#E11D48] hover:bg-rose-700 text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
