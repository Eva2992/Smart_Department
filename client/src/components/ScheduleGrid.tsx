import { type ScheduleEntry } from "../api/scheduleApi";
import { useAuth } from "../context/useAuth";

interface ScheduleGridProps {
  schedules: ScheduleEntry[];
  loading: boolean;
  userRole: string;
  currentUserId?: string;
  onOpenReschedule: (entry: ScheduleEntry) => void;
  onOpenCancel: (entry: ScheduleEntry) => void;
  onOpenStudentRequest?: (entry: ScheduleEntry) => void;
}

export function ScheduleGrid({
  schedules,
  loading,
  userRole,
  currentUserId,
  onOpenReschedule,
  onOpenCancel,
  onOpenStudentRequest,
}: ScheduleGridProps) {
  const { user } = useAuth();
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-[#6B7280]">
        <div className="w-8 h-8 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium">Loading departmental timetable...</p>
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="p-12 text-center bg-[#FFFFFF] border border-gray-100 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[#6B7280]">
        <span className="text-4xl">🗓️</span>
        <h3 className="text-base font-bold text-[#1F2937] mt-2 font-[Poppins]">
          No Scheduled Classes Found
        </h3>
        <p className="text-xs text-[#6B7280] mt-1">
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

  const getStatusBadge = (status: string, type?: string) => {
    if (type === "CT") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DA532C]/10 text-[#DA532C] border border-[#DA532C]/30">
          ⚡ CT Session
        </span>
      );
    }

    switch (status) {
      case "SCHEDULED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#374151] border border-gray-200">
            ● Scheduled
          </span>
        );
      case "RESCHEDULED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 animate-pulse">
            ↺ Rescheduled
          </span>
        );
      case "CANCELLED":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E11D48]/10 text-[#E11D48] border border-[#E11D48]/30 line-through">
            ✕ Cancelled
          </span>
        );
      case "HOLIDAY":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F59E0B]/15 text-[#B45309] border border-[#F59E0B]/30">
            ★ Holiday — No Class
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F3F4F6] text-[#374151] border border-gray-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {schedules.map((entry) => {
        const isOwnerOrAdmin =
          userRole === "ADMIN" ||
          (userRole === "TEACHER" && (entry.teacherId === currentUserId || !currentUserId)) ||
          (userRole === "CR" && (entry.batchId === user?.batchId || !user?.batchId));

        const isActionable = entry.status !== "CANCELLED" && entry.status !== "HOLIDAY";

        const dateFormatted = entry.date ? entry.date.split("T")[0] : "";

        return (
          <div
            key={entry.id}
            className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.06)] bg-[#FFFFFF] ${
              entry.status === "CANCELLED"
                ? "border-rose-100 bg-rose-50/20 opacity-75"
                : entry.status === "HOLIDAY"
                  ? "border-amber-200 bg-amber-50/20"
                  : entry.status === "RESCHEDULED"
                    ? "border-amber-300 bg-amber-50/30"
                    : "border-gray-100 hover:border-gray-200 hover:shadow-md"
            }`}
          >
            {/* Header: Course Code & Status Badge */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#DC143C]/10 text-[#DC143C] border border-[#DC143C]/20 font-[Poppins]">
                  {entry.course?.code || entry.type}
                </span>
                {getStatusBadge(entry.status, entry.type)}
              </div>

              {/* Course Title */}
              <h3
                className={`text-base font-bold font-[Poppins] line-clamp-1 ${
                  entry.status === "CANCELLED" || entry.status === "HOLIDAY"
                    ? "line-through text-[#6B7280]"
                    : "text-[#1F2937]"
                }`}
              >
                {entry.course?.name || "Academic Session"}
              </h3>

              {/* Batch & Instructor info */}
              <div className="mt-3.5 space-y-2 text-xs text-[#1F2937]">
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] font-medium">👨‍🏫 Instructor:</span>
                  <span className="font-semibold text-[#1F2937]">
                    {entry.teacher?.name || "Assigned Faculty"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] font-medium">👥 Batch:</span>
                  <span className="font-semibold text-[#1F2937]">
                    {entry.batch?.name || "Department Batch"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] font-medium">🏢 Room:</span>
                  <span className="font-bold text-[#16A34A] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {entry.room?.roomNumber || "TBD"}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">({entry.room?.type})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] font-medium">📅 Date:</span>
                  <span className="font-medium text-[#1F2937]">{dateFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B7280] font-medium">⏰ Time:</span>
                  <span
                    className={`font-semibold ${
                      entry.status === "RESCHEDULED" ? "text-[#F59E0B]" : "text-[#DC143C]"
                    }`}
                  >
                    {formatTime(entry.startTime)} — {formatTime(entry.endTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions for Authorized Roles */}
            {isOwnerOrAdmin && isActionable && (
              <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center gap-2.5">
                <button
                  onClick={() => onOpenReschedule(entry)}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>↺ Reschedule</span>
                </button>
                <button
                  onClick={() => onOpenCancel(entry)}
                  className="py-2 px-3.5 rounded-xl text-xs font-bold text-[#E11D48] hover:bg-rose-50 border border-[#E11D48]/40 hover:border-[#E11D48] transition-all cursor-pointer"
                >
                  ✕ Cancel
                </button>
              </div>
            )}

            {/* Actions for Students and CRs (FR-17, FR-18) */}
            {!isOwnerOrAdmin && (userRole === "STUDENT" || userRole === "CR") && isActionable && (
              <div className="mt-5 pt-3.5 border-t border-gray-100">
                <button
                  onClick={() => onOpenStudentRequest?.(entry)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold text-[#DC143C] bg-rose-50/60 hover:bg-rose-100/60 border border-[#DC143C]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>📩 Request Cancellation / Reschedule</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
