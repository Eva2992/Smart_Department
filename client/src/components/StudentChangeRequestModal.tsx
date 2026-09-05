import { useState } from "react";
import {
  type ScheduleEntry,
  type CreateChangeRequestInput,
  submitChangeRequest,
} from "../api/scheduleApi";

interface StudentChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: ScheduleEntry | null;
  rooms: Array<{ id: string; roomNumber: string; type: string }>;
  onSuccess: () => void;
}

export function StudentChangeRequestModal({
  isOpen,
  onClose,
  entry,
  rooms,
  onSuccess,
}: StudentChangeRequestModalProps) {
  const [type, setType] = useState<"CANCEL" | "RESCHEDULE">("CANCEL");
  const [reason, setReason] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredStartTime, setPreferredStartTime] = useState("10:00");
  const [preferredEndTime, setPreferredEndTime] = useState("11:30");
  const [preferredRoomId, setPreferredRoomId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a reason for the request.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateChangeRequestInput = {
        type,
        reason: reason.trim(),
      };

      if (type === "RESCHEDULE" && preferredDate) {
        payload.preferredDate = preferredDate;
        payload.preferredStartTime = preferredStartTime;
        payload.preferredEndTime = preferredEndTime;
        if (preferredRoomId) {
          payload.preferredRoomId = preferredRoomId;
        }
      }

      await submitChangeRequest(entry.id, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit class change request";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const entryDate = entry.date ? entry.date.split("T")[0] : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl max-w-md w-full p-6 text-[#1F2937] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
              <span>📩 Request Class Change</span>
            </h2>
            <p className="text-xs text-[#6B7280] mt-1">
              {entry.course?.code || "Class"} - {entry.course?.name || "General"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#1F2937] p-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Request Type Selector */}
        <div className="flex gap-2 mt-4 p-1 bg-gray-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setType("CANCEL")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              type === "CANCEL"
                ? "bg-white text-[#E11D48] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
          >
            ⚠️ Cancellation Request (FR-17)
          </button>
          <button
            type="button"
            onClick={() => setType("RESCHEDULE")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              type === "RESCHEDULE"
                ? "bg-white text-[#DC143C] shadow-xs"
                : "text-[#6B7280] hover:text-[#1F2937]"
            }`}
          >
            📅 Reschedule Request (FR-18)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed">
            👨‍🏫 <strong>Instructor:</strong> {entry.teacher?.name || "Faculty"}
            <br />
            📅 <strong>Current Slot:</strong> {entryDate} in {entry.room?.roomNumber || "TBD"}
            <br />
            💡 Your request will be sent to the assigned teacher for review. Duplicate active
            requests are blocked until resolved.
          </div>

          {/* Reason (Required) */}
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1">
              Reason for Request <span className="text-[#DC143C]">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                type === "CANCEL"
                  ? "e.g. Clash with university cultural program or semester final..."
                  : "e.g. Clash with lab exam, requesting alternate slot..."
              }
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm resize-none"
            ></textarea>
          </div>

          {/* Optional Preferred Slot for Reschedule */}
          {type === "RESCHEDULE" && (
            <div className="space-y-3 p-3.5 bg-gray-50 border border-gray-200 rounded-2xl">
              <span className="text-xs font-bold text-[#1F2937] block">
                Preferred Alternate Slot (Optional)
              </span>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Preferred Date
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={preferredStartTime}
                    onChange={(e) => setPreferredStartTime(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={preferredEndTime}
                    onChange={(e) => setPreferredEndTime(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                  Preferred Room (Optional)
                </label>
                <select
                  value={preferredRoomId}
                  onChange={(e) => setPreferredRoomId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                >
                  <option value="">No preference</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} ({r.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

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
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                type === "CANCEL"
                  ? "bg-[#E11D48] hover:bg-rose-700"
                  : "bg-[#DC143C] hover:bg-[#B01030]"
              }`}
            >
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
