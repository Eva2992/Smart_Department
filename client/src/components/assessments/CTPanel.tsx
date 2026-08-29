import { useState, useEffect, useCallback } from "react";
import { ctApi } from "../../api/assessments.js";
import { getSchedules } from "../../api/scheduleApi.js"; // colleague's existing schedule API
import { Alert } from "../Alert.js";
import type { ScheduleEntry } from "../../api/scheduleApi.js";
import type { UpdateCTPayload } from "../../types/assessments.js";

// ── Helpers (module scope — not recreated on each render) ─────────────────────
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

/** Converts an ISO datetime string to the HH:MM format expected by <input type="time"> */
function isoToTimeInput(isoString?: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Lightweight confirm dialog (replaces browser confirm/alert) ───────────────
interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({ message, confirmLabel = "Confirm", onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-sm rounded-[20px] shadow-soft overflow-hidden">
        <div className="p-6 space-y-4">
          <p className="text-sm text-text leading-relaxed">{message}</p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-gray-100 rounded-lg transition-colors"
            >
              Keep CT
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-error hover:bg-error/80 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Cancelling..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CTPanel() {
  // CT entries and convertible class slots both come from the same schedule fetch.
  // We use ScheduleEntry directly (no cast) — it's the actual shape returned.
  const [cts, setCts] = useState<ScheduleEntry[]>([]);
  const [classSlots, setClassSlots] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduleEntry | null>(null);

  // Cancel confirm state
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // TODO: replace hardcoded IDs with values from the auth context once wired up
  const teacherId = "teacher-1";
  const batchId = "batch-1";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const entries = await getSchedules({ batchId });
      // Split by type — no cast needed since both use ScheduleEntry
      setCts(entries.filter((e) => e.type === "CT"));
      setClassSlots(entries.filter((e) => e.type === "CLASS" && e.status === "SCHEDULED"));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCancelConfirmed = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await ctApi.cancel(cancelTarget, teacherId);
      setCancelTarget(null);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel CT");
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-text">Class Tests (CT)</h2>
          <p className="text-sm text-text-muted mt-1">
            Convert a scheduled class slot into a CT session.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-surface px-4 py-2 rounded-lg font-medium shadow-soft hover:bg-primary-dark transition-colors"
        >
          + Schedule CT
        </button>
      </div>

      {error && (
        <Alert type="error" message={error} onClose={() => setError(null)} />
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {fmtTime(ct.startTime)} - {fmtTime(ct.endTime)}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m3-4h1m-1 4h1m-5 8h8" />
                    </svg>
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
                    onClick={() => setCancelTarget(ct.id)}
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

      {/* CANCEL CONFIRMATION */}
      {cancelTarget && (
        <ConfirmDialog
          message="Are you sure you want to cancel this CT? It will be converted back into a regular class slot."
          confirmLabel="Cancel CT"
          onConfirm={handleCancelConfirmed}
          onCancel={() => setCancelTarget(null)}
          loading={cancelling}
        />
      )}

      {/* CREATE MODAL — teacher picks a class slot and sets the topic */}
      {showCreate && (
        <CTCreateModal
          teacherId={teacherId}
          classSlots={classSlots}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <CTEditModal
          ct={editTarget}
          teacherId={teacherId}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ── Create Modal (slot picker) ────────────────────────────────────────────────

interface CreateProps {
  teacherId: string;
  classSlots: ScheduleEntry[];
  onClose: () => void;
  onSuccess: () => void;
}

function CTCreateModal({ teacherId, classSlots, onClose, onSuccess }: CreateProps) {
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotId) {
      setError("Please select a class slot to convert.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setWarning(null);

    try {
      const res = await ctApi.schedule({
        scheduleEntryId: selectedSlotId,
        teacherId,
        topic,
        confirmSameDayConflict: requiresConfirmation,
      });
      if (res.warnings && res.warnings.length > 0) {
        setWarning(res.warnings[0]);
        return; // Modal stays open so user can acknowledge the warning
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
          <h3 className="font-heading text-lg font-semibold text-text">Schedule CT</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {warning && (
            <Alert
              type="warning"
              message={`${warning}${requiresConfirmation ? " — Click 'Confirm & Schedule' to proceed." : ""}`}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Select Class Slot to Convert
            </label>
            {classSlots.length === 0 ? (
              <p className="text-sm text-text-muted italic">
                No scheduled class slots available to convert.
              </p>
            ) : (
              <select
                required
                value={selectedSlotId}
                onChange={(e) => {
                  setSelectedSlotId(e.target.value);
                  setRequiresConfirmation(false);
                  setWarning(null);
                }}
                className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              >
                <option value="">— Choose a slot —</option>
                {classSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {fmtDate(slot.date)} {fmtTime(slot.startTime)}–{fmtTime(slot.endTime)}{" "}
                    | {slot.course?.code ?? "No course"} | Room {slot.room?.roomNumber ?? "TBD"}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Topic</label>
            <input
              required
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              placeholder="e.g. Midterm Syllabus"
            />
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
              disabled={submitting || classSlots.length === 0}
              className="bg-primary text-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : requiresConfirmation
                ? "Confirm & Schedule"
                : "Schedule CT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditProps {
  ct: ScheduleEntry;
  teacherId: string;
  onClose: () => void;
  onSuccess: () => void;
}

function CTEditModal({ ct, teacherId, onClose, onSuccess }: EditProps) {
  const [topic, setTopic] = useState(ct.topic || "");
  const [date, setDate] = useState(ct.date ? ct.date.split("T")[0] : "");
  // isoToTimeInput is a pure module-level helper — no re-creation on render
  const [startTime, setStartTime] = useState(isoToTimeInput(ct.startTime));
  const [endTime, setEndTime] = useState(isoToTimeInput(ct.endTime));
  const [roomNumber, setRoomNumber] = useState(ct.room?.roomNumber || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setWarning(null);

    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00`).toISOString();
    const dateIso = new Date(`${date}T00:00:00`).toISOString();

    const payload: UpdateCTPayload = {
      teacherId,
      topic,
      roomNumber,
      date: dateIso,
      startTime: startIso,
      endTime: endIso,
      // Always forward the confirmation flag so the server can honour it
      confirmSameDayConflict: requiresConfirmation,
    };

    try {
      const res = await ctApi.update(ct.id, payload);
      if (res.warnings && res.warnings.length > 0) {
        setWarning(res.warnings[0]);
        return;
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
          <h3 className="font-heading text-lg font-semibold text-text">Edit CT</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {warning && (
            <Alert
              type="warning"
              message={`${warning}${requiresConfirmation ? " — Click 'Confirm & Save' to proceed." : ""}`}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Topic</label>
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
                  setWarning(null);
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
              {submitting
                ? "Saving..."
                : requiresConfirmation
                ? "Confirm & Save"
                : "Save CT"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
