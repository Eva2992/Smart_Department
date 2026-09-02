import React, { useState, useEffect } from "react";
import { type Room, createScheduleEntry, checkConflict } from "../api/scheduleApi";
import { academicApi } from "../api/academic";
import { useAuth } from "../context/useAuth";

interface MakeupClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
  rooms: Room[];
}

const TIME_SLOTS = [
  { start: "08:30", end: "10:00" },
  { start: "10:00", end: "11:30" },
  { start: "11:30", end: "13:00" },
  { start: "13:30", end: "15:00" },
  { start: "15:00", end: "16:30" },
];

export function MakeupClassModal({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
  rooms,
}: MakeupClassModalProps) {
  const { user } = useAuth();

  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("08:30");
  const [endTime, setEndTime] = useState("10:00");
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  const [batchId, setBatchId] = useState(user?.batchId || "");
  const [courseId, setCourseId] = useState("");
  const [teacherId, setTeacherId] = useState(user?.id || "");
  const [topic, setTopic] = useState("Makeup Class Session");

  const [batches, setBatches] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string; code: string }>>([]);

  const [isChecking, setIsChecking] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  useEffect(() => {
    if (!isOpen) return;

    academicApi.getBatches().then((bList) => {
      const mapped = bList.map((b) => ({ id: b.id, name: `${b.name} Batch` }));
      setBatches(mapped);
      if (!batchId && mapped.length > 0) {
        setBatchId(user?.batchId || mapped[0].id);
      }
    }).catch(console.error);

    academicApi.getTeachers().then((tList) => {
      setTeachers(tList);
      if (!teacherId && tList.length > 0) {
        setTeacherId(tList[0].id);
      }
    }).catch(console.error);

    if (rooms.length > 0 && !roomId) {
      setRoomId(rooms[0].id);
    }
  }, [isOpen, user?.batchId, user?.id, rooms]);

  // Load courses for selected batch
  useEffect(() => {
    const targetBatchId = user?.batchId || batchId;
    if (!targetBatchId) return;

    academicApi.getSemesters({ batchId: targetBatchId, status: "ACTIVE" as any }).then((semesters) => {
      const loadedCourses: Array<{ id: string; name: string; code: string }> = [];
      semesters.forEach((s) => {
        if (s.courses) {
          s.courses.forEach((c: any) => {
            loadedCourses.push({ id: c.id, name: c.name, code: c.code });
          });
        }
      });
      setCourses(loadedCourses);
      if (loadedCourses.length > 0 && !courseId) {
        setCourseId(loadedCourses[0].id);
      }
    }).catch(console.error);
  }, [batchId, user?.batchId]);

  // Conflict checking
  useEffect(() => {
    if (!date || !startTime || !endTime || !roomId) return;

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const res = await checkConflict({
          date,
          startTime,
          endTime,
          roomId,
          teacherId: teacherId || undefined,
          batchId: user?.batchId || batchId || undefined,
        });

        if (res.hasConflict) {
          setHasConflict(true);
          setConflictMsg(res.summaryMessage || "Room or instructor conflict detected.");
        } else {
          setHasConflict(false);
          setConflictMsg("✓ Clear: No scheduling clash");
        }
      } catch (err) {
        console.error("Conflict check failed:", err);
      } finally {
        setIsChecking(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [date, startTime, endTime, roomId, teacherId, batchId, user?.batchId]);

  if (!isOpen) return null;

  const handleTimeSlotChange = (start: string) => {
    setStartTime(start);
    const slot = TIME_SLOTS.find((s) => s.start === start);
    if (slot) setEndTime(slot.end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      setError("Please select a course for this class session.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await createScheduleEntry({
        courseId,
        teacherId: teacherId || user?.id || "",
        roomId,
        batchId: user?.batchId || batchId,
        date,
        startTime,
        endTime,
        topic: topic.trim(),
        type: "CLASS",
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule makeup class.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wider">
              Ad-Hoc Session Management
            </span>
            <h3 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
              Schedule Makeup / Extra Class
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
                Time Slot
              </label>
              <select
                value={startTime}
                onChange={(e) => handleTimeSlotChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.start} value={slot.start}>
                    {slot.start} - {slot.end}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
                Room
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.roomNumber} ({r.type})
                  </option>
                ))}
              </select>
            </div>

            {user?.role !== "CR" && (
              <div>
                <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
                  Target Batch
                </label>
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  required
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
              Course
            </label>
            {courses.length > 0 ? (
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              >
                <option value="" disabled>Select Course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Course ID or Code (e.g. CSE-311)"
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
              Instructor / Faculty
            </label>
            {teachers.length > 0 ? (
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="Teacher ID"
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
              Topic / Note (Optional)
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Makeup Class for missed lecture on Concurrency"
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
            />
          </div>

          {/* Conflict live feedback */}
          <div className="h-6">
            {isChecking ? (
              <span className="text-xs text-[#6B7280]">Checking availability...</span>
            ) : conflictMsg ? (
              <span className={`text-xs font-bold ${hasConflict ? "text-[#E11D48]" : "text-[#16A34A]"}`}>
                {conflictMsg}
              </span>
            ) : null}
          </div>

          {/* Error Message: Placed EXACTLY above submit button */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
              ✕ {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || hasConflict || isChecking}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer font-[Poppins]"
            >
              {isSubmitting ? "Scheduling..." : "Schedule Makeup Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
