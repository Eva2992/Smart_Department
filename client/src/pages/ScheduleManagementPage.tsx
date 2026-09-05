import { useState, useEffect, useCallback } from "react";
import {
  type ScheduleEntry,
  type Holiday,
  getSchedules,
  getRooms,
  getHolidays,
} from "../api/scheduleApi";
import { academicApi } from "../api/academic";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { RescheduleModal } from "../components/RescheduleModal";
import { CancelModal } from "../components/CancelModal";
import { StudentChangeRequestModal } from "../components/StudentChangeRequestModal";
import { TeacherChangeRequestsPanel } from "../components/TeacherChangeRequestsPanel";
import { HolidayManager } from "../components/HolidayManager";
import { HolidayBanner } from "../components/HolidayBanner";
import { RoomMatrix } from "../components/RoomMatrix";
import { SeminarBookingForm } from "../components/SeminarBookingForm";
import { ConflictTester } from "../components/ConflictTester";
import { MakeupClassModal } from "../components/MakeupClassModal";
import { ManageCoursesModal } from "../components/academic/ManageCoursesModal";
import { useAuth } from "../context/useAuth.js";

interface ScheduleManagementPageProps {
  defaultTab?: "timetable" | "rooms" | "holidays" | "conflicts" | "requests";
}

export function ScheduleManagementPage({ defaultTab = "timetable" }: ScheduleManagementPageProps) {
  const { user } = useAuth();
  const todayStr = new Date().toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState<
    "timetable" | "rooms" | "holidays" | "conflicts" | "requests"
  >(defaultTab);

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; roomNumber: string; type: string }>>([
    { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
    { id: "r-102", roomNumber: "R-102", type: "CLASSROOM" },
    { id: "r-103", roomNumber: "R-103", type: "CLASSROOM" },
    { id: "r-104", roomNumber: "R-104", type: "CLASSROOM" },
    { id: "r-105", roomNumber: "R-105", type: "CLASSROOM" },
    { id: "lab-1", roomNumber: "LAB-1", type: "LAB" },
    { id: "lab-2", roomNumber: "LAB-2", type: "LAB" },
    { id: "r-202", roomNumber: "R-202", type: "MULTIPURPOSE" },
  ]);
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters - date strictly defaults to today's date
  const [batchFilter, setBatchFilter] = useState(user?.batchId || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState(todayStr);

  // Modals state
  const [selectedForReschedule, setSelectedForReschedule] = useState<ScheduleEntry | null>(null);
  const [selectedForCancel, setSelectedForCancel] = useState<ScheduleEntry | null>(null);
  const [selectedForStudentRequest, setSelectedForStudentRequest] = useState<ScheduleEntry | null>(
    null
  );
  const [activeHoliday, setActiveHoliday] = useState<Holiday | null>(null);
  const [isMakeupModalOpen, setIsMakeupModalOpen] = useState(false);
  const [isManageCoursesOpen, setIsManageCoursesOpen] = useState(false);

  useEffect(() => {
    academicApi
      .getBatches()
      .then((data) => {
        setBatches(data.map((b) => ({ id: b.id, name: `${b.name} Batch` })));
      })
      .catch(console.error);
  }, []);

  const adjustDate = (days: number) => {
    const current = new Date(dateFilter || todayStr);
    current.setDate(current.getDate() + days);
    setDateFilter(current.toISOString().split("T")[0]);
  };

  const fetchScheduleData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleData, roomData, holidayData] = await Promise.allSettled([
        getSchedules({
          batchId: batchFilter || undefined,
          status: statusFilter ? (statusFilter as ScheduleEntry["status"]) : undefined,
          date: dateFilter, // Strictly enforce single-date view
        }),
        getRooms(),
        dateFilter
          ? getHolidays({ date: dateFilter, batchId: batchFilter || undefined })
          : Promise.resolve([]),
      ]);

      if (scheduleData.status === "fulfilled") {
        setSchedules(scheduleData.value);
      }
      if (roomData.status === "fulfilled" && roomData.value.length > 0) {
        setRooms(roomData.value);
      }
      if (holidayData.status === "fulfilled" && holidayData.value.length > 0) {
        setActiveHoliday(holidayData.value[0]);
      } else {
        setActiveHoliday(null);
      }
    } catch (err) {
      console.error("Failed to load schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, [batchFilter, statusFilter, dateFilter]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const userRole = user?.role || "STUDENT";
  const userId = user?.id;
  const canScheduleClass = userRole === "ADMIN" || userRole === "TEACHER" || userRole === "CR";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] p-6 rounded-3xl border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DC143C]/10 text-[#DC143C] rounded-full text-xs font-bold mb-2">
            <span>JU CSE Departmental Routine Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1F2937] font-[Poppins]">
            Class Routine &amp; Schedule Management
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Day-wise routine schedule, 3-way transactional conflict checking, room matrix &amp;
            holiday declarations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canScheduleClass && (
            <button
              type="button"
              onClick={() => setIsMakeupModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Schedule Makeup Class</span>
            </button>
          )}

          {userRole === "CR" && (
            <button
              type="button"
              onClick={() => setIsManageCoursesOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1F2937] hover:bg-black text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>📚 Manage Batch Courses</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchScheduleData}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 hover:border-gray-300 text-[#1F2937] shadow-2xs hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>🔄 Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("timetable")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "timetable"
              ? "bg-[#DC143C] text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <span>🗓️ Class Timetable &amp; Schedule</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              activeTab === "timetable" ? "bg-white/20 text-white" : "bg-gray-100 text-[#6B7280]"
            }`}
          >
            {schedules.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "rooms"
              ? "bg-[#DC143C] text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <span>🏢 Room Availability Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab("holidays")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "holidays"
              ? "bg-[#DC143C] text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <span>★ Holidays &amp; Off-Days</span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "requests"
              ? "bg-[#DC143C] text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <span>📩 Change Requests</span>
        </button>

        {userRole !== "STUDENT" && (
          <button
            onClick={() => setActiveTab("conflicts")}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === "conflicts"
                ? "bg-[#DC143C] text-white shadow-xs"
                : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
            }`}
          >
            <span>⚡ Conflict Engine Tester</span>
          </button>
        )}
      </div>

      {/* Main Tab Content */}
      {activeTab === "timetable" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="p-4 bg-[#FFFFFF] border border-gray-100 rounded-3xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#6B7280] mb-1">
                  Batch Filter
                </label>
                <select
                  value={batchFilter}
                  onChange={(e) => setBatchFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                >
                  <option value="">All Batches</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#6B7280] mb-1">
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                >
                  <option value="">All Statuses</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="RESCHEDULED">Rescheduled</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="HOLIDAY">Holiday</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-[#6B7280] mb-1">
                  Schedule Date (Specific Date / Today)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => adjustDate(-1)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-gray-300 hover:bg-gray-100 transition cursor-pointer"
                    title="Previous Day"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilter(todayStr)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      dateFilter === todayStr
                        ? "bg-[#DC143C] text-white border-[#DC143C]"
                        : "border-gray-300 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustDate(1)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-gray-300 hover:bg-gray-100 transition cursor-pointer"
                    title="Next Day"
                  >
                    ▶
                  </button>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value || todayStr)}
                    className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                  />
                </div>
              </div>

              {(batchFilter !== (user?.batchId || "") ||
                statusFilter ||
                dateFilter !== todayStr) && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchFilter(user?.batchId || "");
                    setStatusFilter("");
                    setDateFilter(todayStr);
                  }}
                  className="mt-4 text-xs text-[#DC143C] font-semibold hover:underline cursor-pointer"
                >
                  Reset to Today
                </button>
              )}
            </div>
          </div>

          {/* Active Holiday Banner on Selected Date */}
          {activeHoliday && <HolidayBanner holiday={activeHoliday} />}

          {/* Schedule Grid */}
          <ScheduleGrid
            schedules={schedules}
            loading={loading}
            userRole={userRole}
            currentUserId={userId}
            onOpenReschedule={(entry) => setSelectedForReschedule(entry)}
            onOpenCancel={(entry) => setSelectedForCancel(entry)}
            onOpenStudentRequest={(entry) => setSelectedForStudentRequest(entry)}
          />
        </div>
      )}

      {activeTab === "requests" && (
        <TeacherChangeRequestsPanel rooms={rooms} onRequestReviewed={fetchScheduleData} />
      )}

      {activeTab === "rooms" && (
        <div className="space-y-6">
          <RoomMatrix />
          {(user?.isChairman || user?.role === "ADMIN" || user?.role === "CR") && (
            <SeminarBookingForm onSuccess={fetchScheduleData} />
          )}
        </div>
      )}

      {activeTab === "holidays" && (
        <HolidayManager userRole={userRole} onHolidayChanged={fetchScheduleData} />
      )}

      {activeTab === "conflicts" && userRole !== "STUDENT" && <ConflictTester rooms={rooms} />}

      {/* Reschedule Modal (FR-16, FR-19) */}
      <RescheduleModal
        isOpen={Boolean(selectedForReschedule)}
        onClose={() => setSelectedForReschedule(null)}
        entry={selectedForReschedule}
        rooms={rooms}
        onSuccess={fetchScheduleData}
      />

      {/* Cancel Modal (FR-15) */}
      <CancelModal
        isOpen={Boolean(selectedForCancel)}
        onClose={() => setSelectedForCancel(null)}
        entry={selectedForCancel}
        onSuccess={fetchScheduleData}
      />

      {/* Student/CR Change Request Modal (FR-17, FR-18) */}
      <StudentChangeRequestModal
        isOpen={Boolean(selectedForStudentRequest)}
        onClose={() => setSelectedForStudentRequest(null)}
        entry={selectedForStudentRequest}
        rooms={rooms}
        onSuccess={fetchScheduleData}
      />

      {/* Makeup Class Modal */}
      <MakeupClassModal
        isOpen={isMakeupModalOpen}
        onClose={() => setIsMakeupModalOpen(false)}
        onSuccess={fetchScheduleData}
        defaultDate={dateFilter}
        rooms={rooms}
      />

      {/* CR Semester Course Management Modal */}
      <ManageCoursesModal
        isOpen={isManageCoursesOpen}
        onClose={() => setIsManageCoursesOpen(false)}
        batchId={user?.batchId || undefined}
        onSuccess={fetchScheduleData}
      />
    </div>
  );
}
