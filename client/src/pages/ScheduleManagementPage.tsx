import { useState, useEffect, useCallback } from "react";
import { type ScheduleEntry, getSchedules, getRooms } from "../api/scheduleApi";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { RescheduleModal } from "../components/RescheduleModal";
import { CancelModal } from "../components/CancelModal";
import { HolidayManager } from "../components/HolidayManager";
import { RoomMatrix } from "../components/RoomMatrix";
import { SeminarBookingForm } from "../components/SeminarBookingForm";
import { ConflictTester } from "../components/ConflictTester";
import { useAuth } from "../context/useAuth.js";

interface ScheduleManagementPageProps {
  defaultTab?: "timetable" | "rooms" | "holidays" | "conflicts";
}

export function ScheduleManagementPage({ defaultTab = "timetable" }: ScheduleManagementPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"timetable" | "rooms" | "holidays" | "conflicts">(
    defaultTab
  );

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
  const [loading, setLoading] = useState(true);

  // Filters
  const [batchFilter, setBatchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // Modals state
  const [selectedForReschedule, setSelectedForReschedule] = useState<ScheduleEntry | null>(null);
  const [selectedForCancel, setSelectedForCancel] = useState<ScheduleEntry | null>(null);

  const fetchScheduleData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleData, roomData] = await Promise.allSettled([
        getSchedules({
          batchId: batchFilter || undefined,
          status: statusFilter ? (statusFilter as ScheduleEntry["status"]) : undefined,
          date: dateFilter || undefined,
        }),
        getRooms(),
      ]);

      if (scheduleData.status === "fulfilled") {
        setSchedules(scheduleData.value);
      }
      if (roomData.status === "fulfilled" && roomData.value.length > 0) {
        setRooms(roomData.value);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] p-6 rounded-3xl border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#DC143C]/10 text-[#DC143C] rounded-full text-xs font-bold mb-2">
            <span>JU CSE Departmental Routine Engine</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1F2937] font-[Poppins]">
            Class Update &amp; Reschedule Management
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Day-wise routine schedule, 3-way transactional conflict checking, room matrix &amp;
            holiday declarations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchScheduleData}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-gray-200 hover:border-gray-300 text-[#1F2937] shadow-2xs hover:bg-gray-50 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>🔄 Refresh Routine</span>
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
          onClick={() => setActiveTab("conflicts")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === "conflicts"
              ? "bg-[#DC143C] text-white shadow-xs"
              : "bg-white text-[#6B7280] hover:text-[#1F2937] hover:bg-gray-50 border border-gray-200"
          }`}
        >
          <span>⚡ Conflict Engine Tester</span>
        </button>
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
                  <option value="batch-52">52nd Batch</option>
                  <option value="batch-51">51st Batch</option>
                  <option value="batch-50">50th Batch</option>
                  <option value="batch-49">49th Batch</option>
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
                  Date Filter
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              {(batchFilter || statusFilter || dateFilter) && (
                <button
                  onClick={() => {
                    setBatchFilter("");
                    setStatusFilter("");
                    setDateFilter("");
                  }}
                  className="mt-4 text-xs text-[#DC143C] font-semibold hover:underline"
                >
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Schedule Grid */}
          <ScheduleGrid
            schedules={schedules}
            loading={loading}
            userRole={userRole}
            currentUserId={userId}
            onOpenReschedule={(entry) => setSelectedForReschedule(entry)}
            onOpenCancel={(entry) => setSelectedForCancel(entry)}
          />
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="space-y-6">
          <RoomMatrix />
          {(user?.isChairman || user?.role === 'ADMIN') && (
            <SeminarBookingForm onSuccess={fetchScheduleData} />
          )}
        </div>
      )}

      {activeTab === "holidays" && (
        <HolidayManager userRole={userRole} onHolidayChanged={fetchScheduleData} />
      )}

      {activeTab === "conflicts" && <ConflictTester rooms={rooms} />}

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={Boolean(selectedForReschedule)}
        onClose={() => setSelectedForReschedule(null)}
        entry={selectedForReschedule}
        rooms={rooms}
        onSuccess={fetchScheduleData}
      />

      {/* Cancel Modal */}
      <CancelModal
        isOpen={Boolean(selectedForCancel)}
        onClose={() => setSelectedForCancel(null)}
        entry={selectedForCancel}
        onSuccess={fetchScheduleData}
      />
    </div>
  );
}
