import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchStudentDashboard, type StudentDashboardData, type ScheduleEntryItem } from "../../api/dashboard.js";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case "CANCELLED": return { bg: "bg-[#E11D48]/10", text: "text-[#E11D48]", border: "border-[#E11D48]" };
    case "RESCHEDULED": return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]" };
    case "CT": return { bg: "bg-[#DA532C]/10", text: "text-[#DA532C]", border: "border-[#DA532C]" };
    case "HOLIDAY": return { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", border: "border-[#F59E0B]" };
    default: return { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300" };
  }
}

function isNextClass(entry: ScheduleEntryItem): boolean {
  const now = Date.now();
  const start = new Date(entry.startTime).getTime();
  const end = new Date(entry.endTime).getTime();
  return now >= start && now <= end || (start > now);
}

/**
 * Student Dashboard component (FR-28).
 */
export function StudentDashboard() {
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"day" | "week">("day");
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchStudentDashboard();
        setData(result);
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(message || "Failed to load dashboard");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

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

  const scheduleEntries = calendarView === "day" ? data.todaySchedule : data.weekSchedule;
  const nextClassId = scheduleEntries.find(
    (entry) => isNextClass(entry) && entry.status === "SCHEDULED"
  )?.id;

  return (
    <div className="space-y-6">
      {/* Batch & Semester Info */}
      <div className="flex items-center gap-3 text-xs text-[#6B7280]">
        <span className="px-3 py-1 bg-gray-100 rounded-full font-semibold">{data.batch.name}</span>
        {data.semester && (
          <span className="px-3 py-1 bg-[#DC143C]/5 text-[#DC143C] rounded-full font-semibold">{data.semester.name}</span>
        )}
      </div>

      {/* ===== Today's Schedule / Calendar View ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DC143C]" />
            {calendarView === "day" ? "Today's Schedule" : "This Week"}
          </h2>
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button onClick={() => setCalendarView("day")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${calendarView === "day" ? "bg-white text-[#DC143C] shadow-sm" : "text-[#6B7280]"}`}>
              Day
            </button>
            <button onClick={() => setCalendarView("week")} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${calendarView === "week" ? "bg-white text-[#DC143C] shadow-sm" : "text-[#6B7280]"}`}>
              Week
            </button>
          </div>
        </div>

        {scheduleEntries.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-8">No classes scheduled</p>
        ) : (
          <div className="space-y-2">
            {scheduleEntries.map((entry) => {
              const isNext = entry.id === nextClassId;
              const statusColors = getStatusColor(entry.type === "CT" ? "CT" : entry.status);

              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-3.5 rounded-xl border transition-all ${
                    isNext
                      ? "border-l-[3px] border-l-[#DC143C] border-[#DC143C]/20 bg-[#DC143C]/[0.02]"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="text-center min-w-[60px]">
                    {calendarView === "week" && (
                      <p className="text-[10px] text-[#6B7280] font-medium">{formatDate(entry.date)}</p>
                    )}
                    <p className="text-xs font-bold text-[#1F2937]">{formatTime(entry.startTime)}</p>
                    <p className="text-[10px] text-[#6B7280]">{formatTime(entry.endTime)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1F2937] truncate">
                      {entry.course?.name || "Class"} <span className="text-xs font-normal text-[#6B7280]">({entry.course?.code})</span>
                    </p>
                    <p className="text-xs text-[#6B7280]">
                      {entry.teacher?.name} • {entry.room?.roomNumber}
                      {entry.topic && <span className="ml-1">• {entry.topic}</span>}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${statusColors.bg} ${statusColors.text}`}>
                    {entry.type === "CT" ? "CT" : entry.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== Two-Column: Upcoming CTs + Upcoming Assignments ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upcoming CTs */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#DA532C]" />
            Upcoming CTs
          </h2>
          {data.upcomingCTs.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-6">No upcoming class tests</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingCTs.map((ct) => (
                <div key={ct.id} className="p-3 rounded-xl border border-gray-100 hover:border-[#DA532C]/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{ct.course?.name}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5">
                        {formatDate(ct.date)} • {formatTime(ct.startTime)} – {formatTime(ct.endTime)}
                      </p>
                      <p className="text-xs text-[#6B7280]">{ct.room?.roomNumber} • {ct.teacher?.name}</p>
                      {ct.topic && <p className="text-xs text-[#DA532C] font-medium mt-1">{ct.topic}</p>}
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#DA532C]/10 text-[#DA532C]">CT</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#1F2937]" />
            Upcoming Assignments
          </h2>
          {data.upcomingAssignments.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-6">No upcoming assignments</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingAssignments.map((a) => {
                const dueBadge =
                  a.status === "DUE_SOON" ? { bg: "bg-[#F59E0B]/10", text: "text-[#F59E0B]", label: "Due Soon" }
                  : a.status === "PAST_DUE" ? { bg: "bg-[#E11D48]/10", text: "text-[#E11D48]", label: "Overdue" }
                  : { bg: "bg-gray-100", text: "text-[#6B7280]", label: "Upcoming" };

                return (
                  <div key={a.id} className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#1F2937]">{a.title}</p>
                        <p className="text-xs text-[#6B7280] mt-0.5">{a.course.name} • {a.teacher.name}</p>
                        <p className="text-xs text-[#6B7280]">Due: {formatDate(a.dueDate)}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${dueBadge.bg} ${dueBadge.text}`}>{dueBadge.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== CT Marks (Collapsible Accordions) ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
          CT Marks
        </h2>
        {data.ctMarksGrouped.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-6">No CT marks available yet</p>
        ) : (
          <div className="space-y-2">
            {data.ctMarksGrouped.map((group) => (
              <div key={group.courseId} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCourse(group.courseId)}
                  className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-[#1F2937]">{group.courseName}</p>
                    <p className="text-xs text-[#6B7280]">{group.courseCode} • {group.marks.length} CT(s)</p>
                  </div>
                  <svg className={`w-4 h-4 text-[#6B7280] transition-transform ${expandedCourses.has(group.courseId) ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedCourses.has(group.courseId) && (
                  <div className="px-3.5 pb-3.5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[#6B7280] border-b border-gray-100">
                          <th className="text-left py-2 font-medium">CT</th>
                          <th className="text-left py-2 font-medium">Date</th>
                          <th className="text-right py-2 font-medium">Marks</th>
                          <th className="text-right py-2 font-medium">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.marks.map((m, i) => {
                          const pct = m.maxMarks > 0 ? Math.round((m.marksObtained / m.maxMarks) * 100) : 0;
                          const pctColor = pct >= 80 ? "text-[#16A34A]" : pct >= 60 ? "text-[#F59E0B]" : "text-[#E11D48]";
                          return (
                            <tr key={m.id} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 font-medium text-[#1F2937]">{m.topic || `CT ${i + 1}`}</td>
                              <td className="py-2 text-[#6B7280]">{formatDate(m.date)}</td>
                              <td className="py-2 text-right font-bold text-[#1F2937]">{m.marksObtained}/{m.maxMarks}</td>
                              <td className={`py-2 text-right font-bold ${pctColor}`}>{pct}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Class Count ===== */}
      <div className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-6">
        <h2 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-[#6B7280]" />
          Class Count (Current Semester)
        </h2>
        {data.classCount.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-6">No class data available</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[#6B7280] border-b border-gray-200">
                  <th className="text-left py-2.5 font-medium">Course</th>
                  <th className="text-left py-2.5 font-medium">Teacher</th>
                  <th className="text-right py-2.5 font-medium">Classes Taken</th>
                </tr>
              </thead>
              <tbody>
                {data.classCount.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5">
                      <span className="font-semibold text-[#1F2937]">{item.courseName}</span>
                      <span className="text-[#6B7280] ml-1">({item.courseCode})</span>
                    </td>
                    <td className="py-2.5 text-[#6B7280]">{item.teacherName}</td>
                    <td className="py-2.5 text-right">
                      <span className="font-bold text-[#1F2937] font-[Poppins] text-sm">{item.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Quick Links ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/results"
          className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-5 hover:border-[#DC143C]/30 border border-gray-100 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#DA532C]/10 text-[#DA532C] flex items-center justify-center text-lg group-hover:scale-105 transition-transform">📊</div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] font-[Poppins]">Examination Results</h3>
              <p className="text-xs text-[#6B7280]">View semester final results</p>
            </div>
          </div>
        </Link>
        <Link
          to="/resources"
          className="bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] p-5 hover:border-[#DC143C]/30 border border-gray-100 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center text-lg group-hover:scale-105 transition-transform">📚</div>
            <div>
              <h3 className="text-sm font-bold text-[#1F2937] font-[Poppins]">Study Resources</h3>
              <p className="text-xs text-[#6B7280]">Download notes, slides, and past papers</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
