import { useState, useEffect, useCallback } from "react";
import { ctApi } from "../../api/assessments.js";
import { scheduleApi } from "../../api/scheduleApi.js"; // Colleague's existing schedule API for fetching schedule
import type { CTEntry, ScheduleCTPayload, UpdateCTPayload } from "../../types/assessments.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CTPanel() {
  const [cts, setCts] = useState<CTEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms State
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<CTEntry | null>(null);

  // Hardcoded for now until proper auth context provides this
  const teacherId = "teacher-1";
  const batchId = "batch-1";
  const courseId = "course-1";

  // Fetch from the Schedule API which provides CT entries
  const loadCTs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await scheduleApi.getBatchSchedule(batchId, new Date().toISOString());
      // Filter out only CT entries from the general schedule
      const ctEntries = res.data.schedule.filter((s: any) => s.type === "CT");
      setCts(ctEntries);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load CTs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCTs();
  }, [loadCTs]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this CT? It will be converted back into a regular class.")) return;
    try {
      await ctApi.cancel(id, teacherId);
      loadCTs();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel CT");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-text">Class Tests (CT)</h2>
          <p className="text-sm text-text-muted mt-1">Schedule and manage CT sessions.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-surface px-4 py-2 rounded-lg font-medium shadow-soft hover:bg-primary-dark transition-colors"
        >
          + Schedule CT
        </button>
      </div>

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-text-muted animate-pulse">Loading CT schedule...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cts.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted bg-surface shadow-soft rounded-[20px]">
              No CTs scheduled.
            </div>
          ) : (
            cts.map((ct) => (
              <div
                key={ct.id}
                className="bg-surface shadow-soft rounded-[20px] p-6 border-l-4 border-secondary flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-text-muted">
                    {ct.course?.code || "COURSE"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                    {fmtDate(ct.date)}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-semibold text-text mb-1">
                  {ct.topic || "Topic not specified"}
                </h3>
                <div className="text-sm text-text-muted flex flex-col gap-1 mb-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {fmtTime(ct.startTime)} - {fmtTime(ct.endTime)}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" /></svg>
                    Room {ct.room?.roomNumber || "TBD"}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-auto">
                  <button
                    onClick={() => setEditTarget(ct)}
                    className="text-sm font-medium text-text-muted hover:text-primary transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCancel(ct.id)}
                    className="text-sm font-medium text-error hover:text-error/80 transition-colors"
                  >
                    Cancel CT
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <CTFormModal
          mode="create"
          teacherId={teacherId}
          batchId={batchId}
          courseId={courseId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadCTs();
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <CTFormModal
          mode="edit"
          ct={editTarget}
          teacherId={teacherId}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            loadCTs();
          }}
        />
      )}
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

interface FormProps {
  mode: "create" | "edit";
  ct?: CTEntry;
  teacherId: string;
  batchId?: string;
  courseId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CTFormModal({ mode, ct, teacherId, batchId, courseId, onClose, onSuccess }: FormProps) {
  const [topic, setTopic] = useState(ct?.topic || "");
  const [date, setDate] = useState(ct?.date ? ct.date.split("T")[0] : "");
  
  // Format times for HTML input
  const formatTimeForInput = (isoString?: string) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const [startTime, setStartTime] = useState(formatTimeForInput(ct?.startTime));
  const [endTime, setEndTime] = useState(formatTimeForInput(ct?.endTime));
  const [roomNumber, setRoomNumber] = useState(ct?.room?.roomNumber || "");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarning(null);

    try {
      // Build ISO strings
      const startIso = new Date(`${date}T${startTime}:00`).toISOString();
      const endIso = new Date(`${date}T${endTime}:00`).toISOString();
      const dateIso = new Date(`${date}T00:00:00`).toISOString();

      if (mode === "create") {
        const res = await ctApi.schedule({
          teacherId,
          batchId: batchId!,
          courseId: courseId!,
          roomNumber,
          topic,
          date: dateIso,
          startTime: startIso,
          endTime: endIso,
          confirmSameDayConflict: requiresConfirmation
        });
        if (res.warnings && res.warnings.length > 0) {
          setWarning(res.warnings[0]);
          return; // Modal stays open to let user confirm or change
        }
      } else {
        const res = await ctApi.update(ct!.id, {
          teacherId,
          topic,
          roomNumber,
          date: dateIso,
          startTime: startIso,
          endTime: endIso,
        });
        if (res.warnings && res.warnings.length > 0) {
          setWarning(res.warnings[0]);
          return;
        }
      }
      onSuccess();
    } catch (err: any) {
      if (err.response?.data?.code === "CT_SAME_DAY_WARNING") {
        setWarning(err.response.data.message);
        setRequiresConfirmation(true);
      } else {
        setError(err.response?.data?.message || "An error occurred");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-[20px] shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-heading text-lg font-semibold text-text">
            {mode === "create" ? "Schedule CT" : "Edit CT"}
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-error/10 text-error p-3 rounded text-sm">{error}</div>
          )}
          {warning && (
            <div className="bg-gold/10 text-gold-700 p-3 rounded text-sm font-medium border border-gold/20">
              Warning: {warning}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Topic (Optional)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              placeholder="e.g. Midterm Syllabus"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Date</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setRequiresConfirmation(false);
                }}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Room Number</label>
              <input
                required
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                placeholder="e.g. R-101"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Start Time</label>
              <input
                required
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">End Time</label>
              <input
                required
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary text-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : (requiresConfirmation ? "Confirm & Save" : "Save CT")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
