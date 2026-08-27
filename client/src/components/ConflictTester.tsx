import { useState, useEffect, useCallback } from "react";
import { checkConflict, type ConflictCheckResponse } from "../api/scheduleApi";

interface ConflictTesterProps {
  rooms: Array<{ id: string; roomNumber: string; type: string }>;
}

export function ConflictTester({ rooms }: ConflictTesterProps) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  const [batchId, setBatchId] = useState("");
  const [teacherId, setTeacherId] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConflictCheckResponse | null>(null);

  const runCheck = useCallback(async () => {
    setLoading(true);
    try {
      const res = await checkConflict({
        date,
        startTime,
        endTime,
        roomId: roomId || undefined,
        teacherId: teacherId || undefined,
        batchId: batchId || undefined,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [date, startTime, endTime, roomId, teacherId, batchId]);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl max-w-3xl mx-auto">
      <div className="pb-4 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span>⚡ 3-Way Conflict Engine Interactive Playground</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Mathematically tests candidate time slots across Room, Teacher, and Batch dimensions.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Room Facility</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Select Room --</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomNumber} ({r.type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Teacher</label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Any / Unspecified --</option>
            <option value="teacher-anup-1">Dr. Anup Kumar</option>
            <option value="teacher-farhana-2">Dr. Farhana</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Student Batch</label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
          >
            <option value="">-- Any / Unspecified --</option>
            <option value="batch-52">52nd Batch</option>
            <option value="batch-51">51st Batch</option>
          </select>
        </div>
      </div>

      {/* Engine Evaluation Output */}
      <div className="mt-6 pt-4 border-t border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Engine Evaluation Result:
        </h4>

        {loading ? (
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-sm flex items-center gap-2">
            <span className="animate-spin">⏳</span> Running overlap interval math...
          </div>
        ) : result?.hasConflict ? (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-700 text-rose-200 text-sm space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <span className="text-lg">❌</span>
              <span>Conflict Detected ({result.conflicts.length} Collision(s))</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs text-rose-200/90 pl-2">
              {result.conflicts.map((c, i) => (
                <li key={i}>
                  <strong className="text-rose-100">[{c.type} CONFLICT]:</strong> {c.message}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-sm flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-lg">✓</span>
            <div>
              <div className="font-bold text-emerald-300">Slot Available</div>
              <p className="text-xs text-emerald-200/80">
                Zero overlaps across Room, Teacher, and Batch constraints.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
