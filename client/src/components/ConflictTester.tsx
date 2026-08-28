import { useState, useEffect, useCallback } from "react";
import { checkConflict, type ConflictCheckResponse } from "../api/scheduleApi";
import { ConflictAlertBadge } from "./ConflictAlertBadge";

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
    <div className="bg-[#FFFFFF] border border-gray-100 rounded-3xl p-6 text-[#1F2937] shadow-[0_4px_12px_rgba(0,0,0,0.06)] max-w-3xl mx-auto">
      <div className="pb-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-[#1F2937] flex items-center gap-2 font-[Poppins]">
          <span>⚡ 3-Way Conflict Engine Interactive Playground</span>
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          Mathematically tests candidate time slots across Room, Teacher, and Batch dimensions.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-[#1F2937] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] text-sm focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1F2937] mb-1">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] text-sm focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1F2937] mb-1">End Time</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] text-sm focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-[#1F2937] mb-1">Room Facility</label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] text-sm focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
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
          <label className="block text-xs font-bold text-[#1F2937] mb-1">
            Teacher ID (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. teacher-1"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] placeholder-gray-400 text-sm focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1F2937] mb-1">Batch ID (Optional)</label>
          <input
            type="text"
            placeholder="e.g. batch-52"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-[#1F2937] placeholder-gray-400 text-sm focus:outline-none focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C]"
          />
        </div>
      </div>

      <div className="mt-6">
        <ConflictAlertBadge
          isChecking={loading}
          hasConflict={result?.hasConflict}
          conflicts={result?.conflicts}
          summaryMessage={result?.summaryMessage}
        />
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={runCheck}
          disabled={loading}
          className="py-2 px-5 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition cursor-pointer"
        >
          {loading ? "Evaluating Engine..." : "⚡ Re-evaluate Conflict Engine"}
        </button>
      </div>
    </div>
  );
}
