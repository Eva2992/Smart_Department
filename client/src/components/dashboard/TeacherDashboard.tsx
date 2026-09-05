import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchTeacherDashboard,
  type TeacherDashboardData,
  type ScheduleEntryItem,
} from "../../api/dashboard.js";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function isNextClass(entry: ScheduleEntryItem): boolean {
  const now = Date.now();
  const start = new Date(entry.startTime).getTime();
  const end = new Date(entry.endTime).getTime();
  return (now >= start && now <= end) || start > now;
}

/**
 * Teacher Dashboard component (FR-29).
 */
export function TeacherDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeBatchTab, setActiveBatchTab] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchTeacherDashboard();
        setData(result);
        if (result.assignedBatches.length > 0) {
          setActiveBatchTab(result.assignedBatches[0].id);
        }
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message || "Failed to load teacher dashboard");
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

  const selectedBatch = data.assignedBatches.find((b) => b.id === activeBatchTab);
  const selectedBatchUpcoming = data.upcomingClasses.filter(
    (c) => c.batch?.id === activeBatchTab || (selectedBatch && c.batch?.name === selectedBatch.name)
  );

  const nextGeneralClassId = data.upcomingClasses.find(
    (entry) => isNextClass(entry) && entry.status === "SCHEDULED"
  )?.id;

  return (
    <div className="space-y-6">
      {/* Teacher Profile / Unique ID Display Header */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#1F2937] font-[Poppins]">{data.teacher.name}</h2>
          <p className="text-xs text-[#6B7280]">
            System ID:{" "}
            <span className="font-semibold text-[#1F2937] bg-gray-100 px-2 py-0.5 rounded-md font-mono">
              {data.teacher.teacherUniqueId || "Not assigned"}
            </span>
          </p>
        </div>

        {/* Quick Actions Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate("/schedules")}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Class
          </button>
          <button
            onClick={() => navigate("/schedules")}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Reschedule Class
          </button>
          <button
            onClick={() => navigate("/assessments")}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Schedule CT
          </button>
          <button
            onClick={() => navigate("/assessments")}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Assignment
          </button>
        </div>
      </div>

      {/* Class Count Stats Cards */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
          Classes Conducted This Semester
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data.classCountByBatch.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl p-4 text-center text-xs text-[#6B7280] border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
              No classes logged for current semester
            </div>
          ) : (
            data.classCountByBatch.map((item) => (
              <div
                key={item.batchId}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex flex-col justify-between"
              >
                <span className="text-xs font-medium text-[#6B7280]">{item.batchName}</span>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-[#1F2937] font-[Poppins]">
                    {item.count}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">classes</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== General Board (All upcoming classes across batches) ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#DC143C]" />
          General Board — Upcoming Classes
        </h2>
        {data.upcomingClasses.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-6">No upcoming classes scheduled</p>
        ) : (
          <div className="space-y-2">
            {data.upcomingClasses.map((entry) => {
              const isNext = entry.id === nextGeneralClassId;

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                    isNext
                      ? "border-l-[3px] border-l-[#DC143C] border-[#DC143C]/20 bg-[#DC143C]/[0.02]"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="text-center min-w-[70px]">
                    <p className="text-[10px] text-[#6B7280] font-medium">{formatDate(entry.date)}</p>
                    <p className="text-xs font-bold text-[#1F2937]">{formatTime(entry.startTime)}</p>
                    <p className="text-[10px] text-[#6B7280]">{formatTime(entry.endTime)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[#1F2937] truncate">
                        {entry.course?.name || "Class"}
                      </p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 text-[#1F2937] rounded-md">
                        {entry.batch?.name || "Batch"}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {entry.course?.code} • Room {entry.room?.roomNumber}
                      {entry.topic && <span className="ml-1">• {entry.topic}</span>}
                    </p>
                  </div>
                  {entry.type === "CT" ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#DA532C]/10 text-[#DA532C]">
                      CT
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        entry.status === "SCHEDULED"
                          ? "bg-emerald-50 text-[#16A34A]"
                          : entry.status === "RESCHEDULED"
                          ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                          : "bg-gray-100 text-[#6B7280]"
                      }`}
                    >
                      {entry.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Batch-Wise View Tabs ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#1F2937]" />
          Batch-Wise Management
        </h2>

        {data.assignedBatches.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-6">No batches assigned to you yet</p>
        ) : (
          <div>
            {/* Horizontal Tabs */}
            <div className="flex border-b border-gray-100 gap-2 overflow-x-auto pb-2">
              {data.assignedBatches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => setActiveBatchTab(batch.id)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                    activeBatchTab === batch.id
                      ? "bg-[#DC143C] text-white shadow-xs"
                      : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"
                  }`}
                >
                  {batch.name} ({batch.program})
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {selectedBatch && (
              <div className="mt-5 space-y-5">
                {/* Courses in this batch */}
                <div>
                  <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Courses Assigned
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedBatch.courses.map((c) => (
                      <div key={c.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm font-semibold text-[#1F2937]">{c.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          {c.code} • {c.semesterName}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Batch Upcoming Schedule */}
                <div>
                  <h4 className="text-xs font-bold text-[#6B7280] uppercase tracking-wider mb-2">
                    Upcoming Classes for {selectedBatch.name}
                  </h4>
                  {selectedBatchUpcoming.length === 0 ? (
                    <p className="text-xs text-[#6B7280] italic py-2">
                      No upcoming classes scheduled for this batch
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedBatchUpcoming.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#1F2937]">
                              {entry.course?.name} ({entry.course?.code})
                            </p>
                            <p className="text-[11px] text-[#6B7280]">
                              {formatDate(entry.date)} • {formatTime(entry.startTime)} –{" "}
                              {formatTime(entry.endTime)} • Room {entry.room?.roomNumber}
                            </p>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              entry.type === "CT"
                                ? "bg-[#DA532C]/10 text-[#DA532C]"
                                : "bg-emerald-50 text-[#16A34A]"
                            }`}
                          >
                            {entry.type === "CT" ? "CT" : entry.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
