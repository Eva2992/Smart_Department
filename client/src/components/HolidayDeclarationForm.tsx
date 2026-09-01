import React, { useState } from "react";
import { type Holiday, declareHoliday } from "../api/scheduleApi";

interface HolidayDeclarationFormProps {
  onSuccess?: (result: { holiday: Holiday; affectedClassesCount: number; message: string }) => void;
  batches?: Array<{ id: string; name: string }>;
}

export const HolidayDeclarationForm: React.FC<HolidayDeclarationFormProps> = ({
  onSuccess,
  batches = [
    { id: "batch-52", name: "52nd Batch" },
    { id: "batch-51", name: "51st Batch" },
    { id: "batch-50", name: "50th Batch" },
    { id: "batch-49", name: "49th Batch" },
  ],
}) => {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"ALL" | "BATCH">("ALL");
  const [batchId, setBatchId] = useState(batches[0]?.id || "batch-52");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please specify a reason or occasion for the holiday.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setBannerMessage(null);

    try {
      const res = await declareHoliday({
        date,
        reason: reason.trim(),
        scope,
        batchId: scope === "BATCH" ? batchId : undefined,
      });

      setBannerMessage(res.message || "Holiday declared successfully.");
      setReason("");
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to declare holiday";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-8 h-8 rounded-xl bg-[#DC143C]/10 text-[#DC143C] flex items-center justify-center font-bold text-sm">
          ★
        </span>
        <div>
          <h2 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
            Declare Academic Holiday
          </h2>
          <p className="text-xs text-[#6B7280]">
            FR-18: Holiday &amp; Off-Day Management
          </p>
        </div>
      </div>

      {/* Warning Callout */}
      <div className="my-4 p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#1F2937] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[#B45309]">
          <span>⚠️</span> Auto-Cancellation Policy
        </div>
        <p className="text-[#6B7280] leading-relaxed">
          Declaring a holiday will automatically cancel all scheduled classes on this date across the chosen scope.
        </p>
      </div>

      {bannerMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
          ✓ {bannerMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
            Holiday Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            aria-label="Holiday Date"
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
            Occasion / Reason
          </label>
          <input
            type="text"
            placeholder="e.g. Independence Day, Eid-ul-Fitr, University Day"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            aria-label="Occasion / Reason"
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
            Holiday Scope
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setScope("ALL")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                scope === "ALL"
                  ? "bg-[#DC143C] text-white border-[#DC143C] shadow-xs"
                  : "bg-white text-[#6B7280] border-gray-200 hover:bg-gray-50"
              }`}
            >
              All Batches
            </button>
            <button
              type="button"
              onClick={() => setScope("BATCH")}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                scope === "BATCH"
                  ? "bg-[#DC143C] text-white border-[#DC143C] shadow-xs"
                  : "bg-white text-[#6B7280] border-gray-200 hover:bg-gray-50"
              }`}
            >
              Specific Batch
            </button>
          </div>
        </div>

        {scope === "BATCH" && (
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
              Target Batch
            </label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              aria-label="Target Batch"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-[Poppins]"
        >
          {isSubmitting ? "Declaring Holiday..." : "Declare Holiday"}
        </button>
      </form>
    </div>
  );
};
