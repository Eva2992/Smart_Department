import React, { useState, useEffect } from "react";
import { type Holiday, declareHoliday } from "../api/scheduleApi";
import { academicApi } from "../api/academic";
import { useAuth } from "../context/useAuth";

interface HolidayDeclarationFormProps {
  onSuccess?: (result: { holiday: Holiday; affectedClassesCount: number; message: string }) => void;
  batches?: Array<{ id: string; name: string }>;
}

export const HolidayDeclarationForm: React.FC<HolidayDeclarationFormProps> = ({
  onSuccess,
  batches: externalBatches,
}) => {
  const { user } = useAuth();
  const isCr = user?.role === "CR";
  const defaultBatches = [
    { id: "batch-52", name: "52nd Batch" },
    { id: "batch-51", name: "51st Batch" },
  ];
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>(
    externalBatches && externalBatches.length > 0 ? externalBatches : defaultBatches
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<"ALL" | "BATCH">(isCr ? "BATCH" : "ALL");
  const [batchId, setBatchId] = useState(user?.batchId || defaultBatches[0].id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!externalBatches || externalBatches.length === 0) {
      academicApi
        .getBatches()
        .then((data) => {
          const mapped = data.map((b) => ({ id: b.id, name: `${b.name} Batch` }));
          if (mapped.length > 0) {
            setBatches(mapped);
            setBatchId((prev) => prev || user?.batchId || mapped[0].id);
          }
        })
        .catch(console.error);
    }
  }, [externalBatches, user?.batchId]);

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
        scope: isCr ? "BATCH" : scope,
        batchId: isCr ? user?.batchId || undefined : scope === "BATCH" ? batchId : undefined,
      });

      setBannerMessage(res.message || "Holiday declared successfully.");
      setReason("");
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to declare holiday.";
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
            {isCr ? "Declare Batch Off-Day" : "Declare Academic Holiday"}
          </h2>
          <p className="text-xs text-[#6B7280]">
            Academic Calendar Closures &amp; Observed Off-Days
          </p>
        </div>
      </div>

      {/* Warning Callout */}
      <div className="my-4 p-3.5 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#1F2937] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[#B45309]">
          <span>⚠️</span> Auto-Cancellation Policy
        </div>
        <p className="text-[#6B7280] leading-relaxed">
          Declaring an off-day will automatically cancel all scheduled classes on this date across
          the chosen scope.
        </p>
      </div>

      {bannerMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold">
          ✓ {bannerMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="holiday-date"
            className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]"
          >
            Holiday Date
          </label>
          <input
            id="holiday-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="holiday-reason"
            className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]"
          >
            Occasion / Reason
          </label>
          <input
            id="holiday-reason"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isCr
                ? "e.g., Batch Study Tour, Cultural Program"
                : "e.g., National Mourning Day, University Foundation"
            }
            required
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-[#1F2937] placeholder-gray-400 focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] text-sm"
          />
        </div>

        {!isCr && (
          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]">
              Scope
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScope("ALL")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  scope === "ALL"
                    ? "bg-[#DC143C] text-white border-[#DC143C]"
                    : "bg-white text-[#6B7280] border-gray-200 hover:bg-gray-50"
                }`}
              >
                All Batches
              </button>
              <button
                type="button"
                onClick={() => setScope("BATCH")}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  scope === "BATCH"
                    ? "bg-[#DC143C] text-white border-[#DC143C]"
                    : "bg-white text-[#6B7280] border-gray-200 hover:bg-gray-50"
                }`}
              >
                Specific Batch
              </button>
            </div>
          </div>
        )}

        {!isCr && scope === "BATCH" && (
          <div>
            <label
              htmlFor="holiday-target-batch"
              className="block text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-1.5 font-[Inter]"
            >
              Target Batch
            </label>
            <select
              id="holiday-target-batch"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
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

        {/* Error message placed immediately above submit button */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
            ✕ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-[Poppins]"
        >
          {isSubmitting ? "Declaring..." : isCr ? "Declare Batch Off-Day" : "Declare Holiday"}
        </button>
      </form>
    </div>
  );
};
