import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth";
import { createSeminar, checkConflict } from "../api/scheduleApi";
import { academicApi } from "../api/academic";
import { RoomSelector } from "./RoomSelector";

interface SeminarBookingFormProps {
  onSuccess?: () => void;
}

const TIME_SLOTS = [
  { start: "08:30", end: "10:00" },
  { start: "10:00", end: "11:30" },
  { start: "11:30", end: "13:00" },
  { start: "13:30", end: "15:00" },
  { start: "15:00", end: "16:30" },
];

export function SeminarBookingForm({ onSuccess }: SeminarBookingFormProps) {
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomId, setRoomId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const isAuthorized = user?.isChairman || user?.role === 'ADMIN' || user?.role === 'CR';

  useEffect(() => {
    academicApi.getBatches().then((data) => {
      const mapped = data.map((b) => ({ id: b.id, name: `${b.name} Batch` }));
      setBatches(mapped);
      if (user?.batchId) {
        setBatchId(user.batchId);
      } else if (mapped.length > 0 && !batchId) {
        setBatchId(mapped[0].id);
      }
    }).catch(console.error);
  }, [user?.batchId]);

  useEffect(() => {
    if (!date || !startTime || !endTime || !roomId) {
      setConflictMsg(null);
      setHasConflict(false);
      return;
    }

    const timer = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await checkConflict({
          date,
          startTime,
          endTime,
          roomId,
        });
        
        if (res.hasConflict) {
          setHasConflict(true);
          setConflictMsg(res.summaryMessage || "Room occupied at selected time.");
        } else {
          setHasConflict(false);
          setConflictMsg("✓ Room Available");
        }
      } catch (err) {
        console.error("Conflict check failed", err);
      } finally {
        setChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [date, startTime, endTime, roomId]);

  const handleStartTimeChange = (val: string) => {
    setStartTime(val);
    const slot = TIME_SLOTS.find(s => s.start === val);
    if (slot) {
      setEndTime(slot.end);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    setSuccessMsg("");
    setErrorMsg(null);
    try {
      await createSeminar({
        title,
        date,
        startTime,
        endTime,
        roomId,
        teacherId: user.id,
        batchId: user.batchId || batchId || batches[0]?.id,
        courseId: courseId || undefined
      });
      setSuccessMsg("Seminar scheduled successfully!");
      if (onSuccess) onSuccess();
      
      // Reset form
      setTitle("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setRoomId("");
      setCourseId("");
      setConflictMsg(null);
      setHasConflict(false);
      
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Failed to create seminar";
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-[#FFFFFF] rounded-2xl p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-center">
        <div className="text-4xl mb-3">🔒</div>
        <h3 className="font-bold text-[#1F2937] font-[Poppins] text-lg mb-2">
          Chairman Access Required
        </h3>
        <p className="text-[#6B7280] text-sm">
          Only the Department Chairman can allocate seminars and workshops.
        </p>
      </div>
    );
  }

  const isFormComplete = title && date && startTime && endTime && roomId && batchId;

  return (
    <div className="bg-[#FFFFFF] rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100">
      <h3 className="text-lg font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2 mb-6">
        📅 Schedule Seminar / Workshop
      </h3>
      
      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {successMsg}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            placeholder="e.g. AI in Healthcare Workshop"
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Room</label>
            <RoomSelector
              value={roomId}
              onChange={setRoomId}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Start Time</label>
            <select
              required
              value={startTime}
              onChange={e => handleStartTimeChange(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            >
              <option value="" disabled>Select Time</option>
              {TIME_SLOTS.map(slot => (
                <option key={slot.start} value={slot.start}>{slot.start}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">End Time</label>
            <input
              type="time"
              required
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Batch (Target Audience)</label>
            <select
              required
              value={batchId}
              onChange={e => setBatchId(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            >
              <option value="" disabled>Select Batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Course (Optional)</label>
            <input
              type="text"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              placeholder="e.g. CSE-311"
              className="w-full bg-[#FFFFFF] border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            />
          </div>
        </div>

        {/* Conflict Display */}
        <div className="h-6 mt-2">
          {checking ? (
            <span className="text-xs text-[#6B7280]">Checking room availability...</span>
          ) : conflictMsg ? (
            <span className={`text-xs font-bold ${hasConflict ? 'text-[#E11D48]' : 'text-[#16A34A]'}`}>
              {conflictMsg}
            </span>
          ) : null}
        </div>

        {/* Error message placed immediately above submit button */}
        {errorMsg && (
          <div className="p-3 my-2 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
            ✕ {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={hasConflict || !isFormComplete || submitting || checking}
          className="w-full mt-4 py-3 rounded-xl text-white font-bold font-[Poppins] text-sm bg-[#DC143C] hover:bg-[#B01030] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {submitting ? 'Scheduling...' : '📅 Schedule Seminar / Workshop'}
        </button>
      </form>
    </div>
  );
}
