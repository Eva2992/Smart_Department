import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchAdminDashboard, type AdminDashboardData } from "../../api/dashboard.js";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHrs = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHrs / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/**
 * Admin Dashboard component (FR-30).
 */
export function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchAdminDashboard();
        setData(result);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message || "Failed to load admin dashboard");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[#E11D48]/5 border border-[#E11D48]/20 rounded-2xl p-6 text-center">
        <p className="text-sm text-[#E11D48] font-medium">{error || "No data available"}</p>
      </div>
    );
  }

  const { systemOverview, pendingPromotions, upcomingHolidays, todayRoomUsage, auditLogs } = data;

  return (
    <div className="space-y-6">
      {/* ===== Quick Management Actions Row ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
          Quick Management Navigation
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/admin/batches"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-[#DC143C]/5 hover:border-[#DC143C]/30 border border-gray-100 transition-all text-xs font-semibold text-[#1F2937] hover:text-[#DC143C]"
          >
            <span className="text-base">🎓</span>
            Semester Creation &amp; Batch
          </Link>
          <Link
            to="/schedules"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-[#DC143C]/5 hover:border-[#DC143C]/30 border border-gray-100 transition-all text-xs font-semibold text-[#1F2937] hover:text-[#DC143C]"
          >
            <span className="text-base">📅</span>
            Routine Generation
          </Link>
          <Link
            to="/rooms"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-[#DC143C]/5 hover:border-[#DC143C]/30 border border-gray-100 transition-all text-xs font-semibold text-[#1F2937] hover:text-[#DC143C]"
          >
            <span className="text-base">🏢</span>
            Room Management
          </Link>
          <Link
            to="/admin/holidays"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 hover:bg-[#DC143C]/5 hover:border-[#DC143C]/30 border border-gray-100 transition-all text-xs font-semibold text-[#1F2937] hover:text-[#DC143C]"
          >
            <span className="text-base">🏖️</span>
            Holiday Management
          </Link>
        </div>
      </div>

      {/* ===== System Overview Cards ===== */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
          System Overview
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 border-l-4 border-l-[#DC143C] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100">
            <p className="text-xs font-medium text-[#6B7280]">Total Students</p>
            <p className="text-2xl font-extrabold text-[#1F2937] font-[Poppins] mt-1">
              {systemOverview.totalStudents}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-l-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100">
            <p className="text-xs font-medium text-[#6B7280]">Total Teachers</p>
            <p className="text-2xl font-extrabold text-[#1F2937] font-[Poppins] mt-1">
              {systemOverview.totalTeachers}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-l-[#DA532C] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100">
            <p className="text-xs font-medium text-[#6B7280]">Active Batches</p>
            <p className="text-2xl font-extrabold text-[#1F2937] font-[Poppins] mt-1">
              {systemOverview.activeBatches}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-l-[#16A34A] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100">
            <p className="text-xs font-medium text-[#6B7280]">Active Semesters</p>
            <p className="text-2xl font-extrabold text-[#1F2937] font-[Poppins] mt-1">
              {systemOverview.activeSemesters}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border-l-4 border-l-[#F59E0B] shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100 col-span-2 sm:col-span-1">
            <p className="text-xs font-medium text-[#6B7280]">Upcoming Events (7d)</p>
            <p className="text-2xl font-extrabold text-[#1F2937] font-[Poppins] mt-1">
              {systemOverview.upcomingEvents}
            </p>
          </div>
        </div>
      </div>

      {/* ===== Pending Actions & Holiday Calendar (2 Cols) ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Actions Panel */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              Pending Actions
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
              {pendingPromotions.length + (systemOverview.unverifiedUsers > 0 ? 1 : 0)} Pending
            </span>
          </div>

          <div className="space-y-3">
            {/* Unverified registrations reminder if any */}
            {systemOverview.unverifiedUsers > 0 && (
              <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-[#F59E0B]/20 rounded-xl">
                <div>
                  <p className="text-xs font-semibold text-[#1F2937]">
                    Unverified Account Registrations
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    {systemOverview.unverifiedUsers} user(s) awaiting verification
                  </p>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#F59E0B] text-white">
                  {systemOverview.unverifiedUsers}
                </span>
              </div>
            )}

            {/* Promotion Requests list */}
            {pendingPromotions.length === 0 && systemOverview.unverifiedUsers === 0 ? (
              <p className="text-sm text-[#6B7280] text-center py-6">No pending action items 🎉</p>
            ) : (
              pendingPromotions.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3.5 border border-gray-100 rounded-xl hover:border-gray-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-[#1F2937]">
                        Semester Promotion: {req.batch.name}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B]/10 text-[#F59E0B]">
                        Pending Review
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Requested by {req.requestedBy.name} ({req.requestedBy.role}) •{" "}
                      {relativeTime(req.createdAt)}
                    </p>
                  </div>
                  <Link
                    to="/admin/batches"
                    className="text-xs font-bold text-[#DC143C] hover:underline"
                  >
                    Review →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Holiday Calendar Preview */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#DA532C]" />
              Upcoming Holidays
            </h2>
            <Link
              to="/admin/holidays"
              className="text-xs font-semibold text-[#DC143C] hover:underline"
            >
              Manage →
            </Link>
          </div>

          {upcomingHolidays.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-6">No upcoming holidays scheduled</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingHolidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/30"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🏖️</span>
                    <div>
                      <p className="text-xs font-semibold text-[#1F2937]">{holiday.reason}</p>
                      <p className="text-[11px] text-[#6B7280]">{formatDate(holiday.date)}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B]">
                    {holiday.scope === "BATCH" && holiday.batch
                      ? holiday.batch.name
                      : "Department-wide"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== Room Allocation Matrix Preview ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
              Today's Room Allocation Preview
            </h2>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Occupancy across department facilities for today
            </p>
          </div>
          <Link
            to="/rooms"
            className="text-xs font-semibold text-[#DC143C] hover:underline"
          >
            View Full Matrix →
          </Link>
        </div>

        {todayRoomUsage.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-6">
            No rooms allocated for classes today
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B7280] border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Room</th>
                  <th className="text-left py-2 font-medium">Type</th>
                  <th className="text-left py-2 font-medium">Time Slot</th>
                  <th className="text-left py-2 font-medium">Course / Activity</th>
                  <th className="text-left py-2 font-medium">Batch</th>
                </tr>
              </thead>
              <tbody>
                {todayRoomUsage.map((slot, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-bold text-[#1F2937]">{slot.room.roomNumber}</td>
                    <td className="py-2.5 text-[#6B7280]">{slot.room.type}</td>
                    <td className="py-2.5 text-[#1F2937] font-medium">
                      {formatTime(slot.startTime)} – {formatTime(slot.endTime)}
                    </td>
                    <td className="py-2.5 text-[#1F2937]">
                      {slot.course?.name || "Event"} ({slot.course?.code || slot.type})
                    </td>
                    <td className="py-2.5 text-[#6B7280]">{slot.batch?.name || "All"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Audit Log Feed ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#6B7280]" />
          System Activity Audit Log
        </h2>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-6">No recent audit log entries</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2.5 pr-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-3 rounded-xl border border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#1F2937] font-mono">
                      {log.action}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-gray-100 text-[#6B7280]">
                      {log.entityType}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    User: {log.user.name} ({log.user.role})
                  </p>
                </div>
                <span className="text-[11px] text-[#6B7280] whitespace-nowrap">
                  {relativeTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
