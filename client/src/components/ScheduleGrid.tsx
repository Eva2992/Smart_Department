import React from "react";
import { type ScheduleEntry } from "../api/scheduleApi";

interface ScheduleGridProps {
  schedules: ScheduleEntry[];
  loading: boolean;
  userRole: string;
  currentUserId?: string;
  onOpenReschedule: (entry: ScheduleEntry) => void;
  onOpenCancel: (entry: ScheduleEntry) => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  schedules,
  loading,
  userRole,
  currentUserId,
  onOpenReschedule,
  onOpenCancel,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm">Loading departmental timetable...</p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400">
        <span className="text-4xl">🗓️</span>
        <h3 className="text-base font-semibold text-slate-200 mt-2">No Scheduled Classes Found</h3>
        <p className="text-xs text-slate-500 mt-1">
          No classes match the selected filter criteria. Try adjusting dates or filters.
        </p>
      </div>
    );
  }

  const formatTime = (time: string) => {
    if (!time) return "";
    if (time.includes("T")) {
      return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return time;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
            ● Scheduled
          </span>
        );
      case "RESCHEDULED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse">
            ↺ Rescheduled
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800">
            ✕ Cancelled
          </span>
        );
      case "HOLIDAY":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-800">
            ★ Holiday
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {schedules.map((entry) => {
        const isOwnerOrAdmin =
          userRole === "ADMIN" ||
          (userRole === "TEACHER" &&
            (entry.teacherId === currentUserId || !currentUserId));

        const isActionable =
          entry.status !== "CANCELLED" && entry.status !== "HOLIDAY";

        const dateFormatted = entry.date ? entry.date.split("T")[0] : "";

        return (
          <div
            key={entry.id}
            className={`flex flex-col justify-between p-5 rounded-2xl border transition duration-200 ${
              entry.status === "CANCELLED"
                ? "bg-slate-900/40 border-slate-800/60 opacity-60"
                : entry.status === "HOLIDAY"
                ? "bg-purple-950/20 border-purple-900/40"
                : entry.status === "RESCHEDULED"
                ? "bg-amber-950/20 border-amber-900/50 shadow-lg shadow-amber-950/10"
                : "bg-slate-900 border-slate-800 hover:border-slate-700 shadow-lg"
            }`}
          >
            {/* Header: Course Code & Status Badge */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80">
                  {entry.course?.code || entry.type}
                </span>
                {getStatusBadge(entry.status)}
              </div>

              {/* Course Title */}
              <h3 className="text-base font-bold text-white line-clamp-1">
                {entry.course?.name || "Academic Session"}
              </h3>

              {/* Batch & Instructor info */}
              <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">👨‍🏫 Instructor:</span>
                  <span className="font-medium text-slate-200">
                    {entry.teacher?.name || "Assigned Faculty"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">👥 Batch:</span>
                  <span className="font-medium text-slate-200">
                    {entry.batch?.name || "Department Batch"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">🏢 Room:</span>
                  <span className="font-semibold text-emerald-400">
                    {entry.room?.roomNumber || "TBD"}
                  </span>
                  <span className="text-[10px] text-slate-500">({entry.room?.type})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">📅 Date:</span>
                  <span className="font-medium text-slate-200">{dateFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">⏰ Time:</span>
                  <span className="font-semibold text-indigo-300">
                    {formatTime(entry.startTime)} — {formatTime(entry.endTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions for Authorized Roles */}
            {isOwnerOrAdmin && isActionable && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => onOpenReschedule(entry)}
                  className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-700/50 hover:border-indigo-600 transition flex items-center justify-center gap-1.5"
                >
                  <span>↺ Reschedule</span>
                </button>
                <button
                  onClick={() => onOpenCancel(entry)}
                  className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/60 transition"
                >
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
