import React, { useState, useMemo } from "react";
import { type Holiday } from "../api/scheduleApi";

interface HolidayCalendarProps {
  holidays: Holiday[];
  selectedBatchId?: string;
  onBatchFilterChange?: (batchId: string) => void;
  batches?: Array<{ id: string; name: string }>;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const HolidayCalendar: React.FC<HolidayCalendarProps> = ({
  holidays,
  selectedBatchId = "",
  onBatchFilterChange,
  batches = [
    { id: "batch-52", name: "52nd Batch" },
    { id: "batch-51", name: "51st Batch" },
    { id: "batch-50", name: "50th Batch" },
    { id: "batch-49", name: "49th Batch" },
  ],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  // Map of holiday date string (YYYY-MM-DD) -> Holiday[]
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const h of holidays) {
      if (!h.date) continue;
      const dateKey = h.date.split("T")[0];

      // Filter by selectedBatchId if any
      if (selectedBatchId && h.scope === "BATCH" && h.batchId !== selectedBatchId) {
        continue;
      }

      const existing = map.get(dateKey) || [];
      existing.push(h);
      map.set(dateKey, existing);
    }
    return map;
  }, [holidays, selectedBatchId]);

  // Calendar grid calculations
  const { calendarDays } = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      holidays: Holiday[];
    }> = [];

    const todayStr = new Date().toISOString().split("T")[0];

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const dateStr = prevDate.toISOString().split("T")[0];
      days.push({
        dayNumber: dayNum,
        dateString: dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        holidays: holidaysByDate.get(dateStr) || [],
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        dayNumber: i,
        dateString: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        holidays: holidaysByDate.get(dateStr) || [],
      });
    }

    // Next month padding to fill grid (multiple of 7)
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const nextDate = new Date(year, month + 1, i);
        const dateStr = nextDate.toISOString().split("T")[0];
        days.push({
          dayNumber: i,
          dateString: dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          holidays: holidaysByDate.get(dateStr) || [],
        });
      }
    }

    return { calendarDays: days };
  }, [year, month, holidaysByDate]);

  // Selected date holidays
  const selectedDayHolidays = selectedDay ? holidaysByDate.get(selectedDay) || [] : [];

  return (
    <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[#1F2937] space-y-6">
      {/* Calendar Header with Navigation and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-extrabold text-[#1F2937] font-[Poppins]">
            {MONTH_NAMES[month]} {year}
          </h2>
          <button
            onClick={handleToday}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-[#1F2937] transition cursor-pointer"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onBatchFilterChange && (
            <select
              value={selectedBatchId}
              onChange={(e) => onBatchFilterChange(e.target.value)}
              aria-label="Filter Holidays by Batch"
              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            >
              <option value="">All Batches &amp; Dept</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={handlePrevMonth}
              aria-label="Previous Month"
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-2xs text-[#1F2937] transition cursor-pointer"
            >
              ◀
            </button>
            <button
              onClick={handleNextMonth}
              aria-label="Next Month"
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-2xs text-[#1F2937] transition cursor-pointer"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-[#6B7280] uppercase tracking-wider font-[Inter]">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((cell, idx) => {
          const hasHoliday = cell.holidays.length > 0;
          const isSelected = selectedDay === cell.dateString;

          return (
            <div
              key={idx}
              onClick={() => setSelectedDay(cell.dateString)}
              className={`min-h-[72px] sm:min-h-[88px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                !cell.isCurrentMonth
                  ? "bg-gray-50/50 border-gray-100 text-gray-400 opacity-60"
                  : isSelected
                    ? "border-[#DC143C] ring-2 ring-[#DC143C]/20 bg-white"
                    : hasHoliday
                      ? "border-amber-300 bg-amber-50/40 hover:border-amber-400 hover:shadow-xs"
                      : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold font-[Poppins] w-6 h-6 rounded-full flex items-center justify-center ${
                    cell.isToday
                      ? "bg-[#DC143C] text-white"
                      : hasHoliday
                        ? "bg-[#F59E0B] text-white shadow-xs"
                        : cell.isCurrentMonth
                          ? "text-[#1F2937]"
                          : "text-gray-400"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {hasHoliday && (
                  <span className="text-[10px] font-bold text-[#B45309] bg-[#F59E0B]/20 px-1.5 py-0.5 rounded-md hidden sm:inline-block">
                    ★ Holiday
                  </span>
                )}
              </div>

              {hasHoliday && (
                <div className="mt-1 space-y-1">
                  {cell.holidays.map((h) => (
                    <div
                      key={h.id}
                      className="text-[10px] font-semibold text-[#B45309] bg-[#F59E0B]/15 border border-[#F59E0B]/30 rounded-lg px-1.5 py-0.5 truncate font-[Inter]"
                      title={h.reason}
                    >
                      {h.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Day Holiday Details Panel */}
      {selectedDay && (
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-[#1F2937] font-[Poppins] text-sm flex items-center gap-2">
              <span>📅 Details for {selectedDay}</span>
            </h4>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-[#6B7280] hover:text-[#1F2937]"
            >
              ✕ Close
            </button>
          </div>

          {selectedDayHolidays.length === 0 ? (
            <p className="text-[#6B7280]">
              No academic holiday declared for this date. Regular departmental schedule applies.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayHolidays.map((h) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-white border border-amber-200 shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#B45309] text-sm font-[Poppins]">
                        ★ {h.reason}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/20 text-[#B45309]">
                        {h.scope === "ALL"
                          ? "Department-Wide"
                          : `Batch: ${h.batch?.name || h.batchId}`}
                      </span>
                    </div>
                    <p className="text-[#6B7280] text-[11px] mt-0.5">
                      All classes for this scope on {selectedDay} are automatically cancelled.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
