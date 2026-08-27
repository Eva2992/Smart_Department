import { useState, useEffect, useCallback } from "react";
import {
  type ScheduleEntry,
  getSchedules,
  getRooms,
  setAuthHeaders,
} from "./api/scheduleApi";
import { ScheduleGrid } from "./components/ScheduleGrid";
import { RescheduleModal } from "./components/RescheduleModal";
import { CancelModal } from "./components/CancelModal";
import { RoomMatrix } from "./components/RoomMatrix";
import { HolidayManager } from "./components/HolidayManager";
import { ConflictTester } from "./components/ConflictTester";

const ROLES = [
  {
    id: "teacher-anup-1",
    name: "Dr. Anup Kumar",
    role: "TEACHER",
    teacherId: "JU-CSE-T01",
    label: "👨‍🏫 Teacher: Dr. Anup",
  },
  {
    id: "teacher-farhana-2",
    name: "Dr. Farhana",
    role: "TEACHER",
    teacherId: "JU-CSE-T02",
    label: "👩‍🏫 Teacher: Dr. Farhana",
  },
  {
    id: "user-admin-1",
    name: "Department Office Admin",
    role: "ADMIN",
    label: "🏢 Admin: Dept Office",
  },
  {
    id: "user-student-52",
    name: "Tanvir Hasan",
    role: "STUDENT",
    batchId: "batch-52",
    label: "🎓 Student: 52nd Batch",
  },
];

export function App() {
  const [currentUser, setCurrentUser] = useState(ROLES[0]);
  const [activeTab, setActiveTab] = useState<"schedule" | "matrix" | "holidays" | "playground">("schedule");

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; roomNumber: string; type: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [batchFilter, setBatchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Modals
  const [selectedEntryForReschedule, setSelectedEntryForReschedule] = useState<ScheduleEntry | null>(null);
  const [selectedEntryForCancel, setSelectedEntryForCancel] = useState<ScheduleEntry | null>(null);

  // Update auth headers on user switch
  useEffect(() => {
    setAuthHeaders({
      userId: currentUser.id,
      role: currentUser.role,
      teacherId: currentUser.teacherId,
      batchId: currentUser.batchId,
      name: currentUser.name,
    });
  }, [currentUser]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [scheduleData, roomData] = await Promise.all([
        getSchedules({
          batchId: batchFilter || undefined,
          status: statusFilter || undefined,
          date: dateFilter || undefined,
        }),
        getRooms(),
      ]);
      setSchedules(scheduleData);
      setRooms(roomData);
    } catch (err) {
      console.error("Failed to load schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, [batchFilter, statusFilter, dateFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
              JU
            </div>
            <div>
              <h1 className="text-base font-bold text-white leading-tight">
                Smart_Schedular — JU CSE Department
              </h1>
              <p className="text-xs text-indigo-400 font-medium">
                Member 4: Class Update, Reschedule & 3-Way Conflict Engine
              </p>
            </div>
          </div>

          {/* Role Switcher Toolbar */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-500 px-2 uppercase tracking-wider">
              Actor:
            </span>
            {ROLES.map((u) => (
              <button
                key={u.id}
                onClick={() => setCurrentUser(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  currentUser.id === u.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/40"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "schedule"
                ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <span>🗓️ Class Timetable & Schedule</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
              {schedules.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "matrix"
                ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <span>🏢 Room Availability Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("holidays")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "holidays"
                ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <span>★ Holidays & Off-Days</span>
          </button>

          <button
            onClick={() => setActiveTab("playground")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
              activeTab === "playground"
                ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <span>⚡ Conflict Engine Tester</span>
          </button>
        </div>

        {/* Tab 1: Schedule Grid */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Batch Filter
                  </label>
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Batches</option>
                    <option value="batch-52">52nd Batch</option>
                    <option value="batch-51">51st Batch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Status Filter
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="RESCHEDULED">Rescheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="HOLIDAY">Holiday</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Date Filter
                  </label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {(batchFilter || statusFilter || dateFilter) && (
                  <button
                    onClick={() => {
                      setBatchFilter("");
                      setStatusFilter("");
                      setDateFilter("");
                    }}
                    className="text-xs text-indigo-400 hover:text-indigo-300 mt-4 underline font-medium"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  🔄 Refresh Timetable
                </button>
              </div>
            </div>

            {/* Schedule Cards Grid */}
            <ScheduleGrid
              schedules={schedules}
              loading={loading}
              userRole={currentUser.role}
              currentUserId={currentUser.id}
              onOpenReschedule={(entry) => setSelectedEntryForReschedule(entry)}
              onOpenCancel={(entry) => setSelectedEntryForCancel(entry)}
            />
          </div>
        )}

        {/* Tab 2: Room Availability Matrix */}
        {activeTab === "matrix" && <RoomMatrix />}

        {/* Tab 3: Holiday & Off-Day Management */}
        {activeTab === "holidays" && (
          <HolidayManager
            userRole={currentUser.role}
            onHolidayChanged={loadData}
          />
        )}

        {/* Tab 4: Conflict Engine Playground */}
        {activeTab === "playground" && <ConflictTester rooms={rooms} />}
      </main>

      {/* Reschedule Modal with Live Conflict Validation Badge */}
      <RescheduleModal
        isOpen={!!selectedEntryForReschedule}
        onClose={() => setSelectedEntryForReschedule(null)}
        entry={selectedEntryForReschedule}
        rooms={rooms}
        onSuccess={loadData}
      />

      {/* Cancel Modal */}
      <CancelModal
        isOpen={!!selectedEntryForCancel}
        onClose={() => setSelectedEntryForCancel(null)}
        entry={selectedEntryForCancel}
        onSuccess={loadData}
      />
    </div>
  );
}

export default App;
