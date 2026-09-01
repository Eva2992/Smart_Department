import React from "react";
import { type Holiday } from "../api/scheduleApi";

interface HolidayBannerProps {
  holiday: Holiday;
  className?: string;
}

export const HolidayBanner: React.FC<HolidayBannerProps> = ({ holiday, className = "" }) => {
  const dateStr = holiday.date ? holiday.date.split("T")[0] : "";

  return (
    <div
      role="alert"
      className={`w-full p-4 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center text-lg font-bold shadow-xs shrink-0">
          ★
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider font-[Poppins]">
              Academic Holiday
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#B45309] border border-[#F59E0B]/30">
              {holiday.scope === "ALL"
                ? "Department-Wide"
                : `Batch ${holiday.batch?.name || holiday.batchId || "Specific"}`}
            </span>
            {dateStr && (
              <span className="text-xs font-medium text-[#6B7280]">
                • {dateStr}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mt-0.5">
            {holiday.reason}
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            All classes scheduled on this date are automatically suspended and marked as{" "}
            <span className="font-semibold text-[#E11D48]">Holiday (Cancelled)</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
