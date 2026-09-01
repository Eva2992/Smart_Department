import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { type Holiday, getUpcomingHolidays } from "../api/scheduleApi";

interface UpcomingHolidaysWidgetProps {
  batchId?: string;
  limit?: number;
  className?: string;
}

export const UpcomingHolidaysWidget: React.FC<UpcomingHolidaysWidgetProps> = ({
  batchId,
  limit = 5,
  className = "",
}) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await getUpcomingHolidays(limit, batchId);
        if (isMounted) {
          setHolidays(data);
        }
      } catch (err) {
        console.error("Failed to fetch upcoming holidays:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [batchId, limit]);

  return (
    <div
      className={`bg-[#FFFFFF] rounded-2xl p-6 shadow-xs border border-gray-200/80 text-[#1F2937] ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-[Poppins]">
            Upcoming Holidays &amp; Off-Days
          </h2>
        </div>
        <Link
          to="/admin/holidays"
          className="text-xs font-semibold text-[#DC143C] hover:underline"
        >
          View All →
        </Link>
      </div>

      {loading ? (
        <div className="py-6 text-center text-xs text-[#6B7280]">
          Loading upcoming holidays...
        </div>
      ) : holidays.length === 0 ? (
        <div className="py-6 text-center text-xs text-[#6B7280] bg-gray-50 rounded-xl">
          No upcoming holidays scheduled in the academic calendar.
        </div>
      ) : (
        <div className="space-y-3">
          {holidays.map((h) => {
            const dateObj = new Date(h.date);
            const dateStr = !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                })
              : h.date.split("T")[0];

            return (
              <div
                key={h.id}
                className="p-3 rounded-xl bg-white border border-gray-100 border-l-4 border-l-[#F59E0B] shadow-2xs hover:border-gray-200 transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#B45309] font-[Poppins]">
                    ★ {dateStr}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#B45309]">
                    {h.scope === "ALL" ? "All Batches" : `Batch ${h.batch?.name || h.batchId}`}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[#1F2937] font-[Inter]">
                  {h.reason}
                </h4>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
