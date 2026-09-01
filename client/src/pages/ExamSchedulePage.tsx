/**
 * ExamSchedulePage — FR-22: Semester Final Exam Routine Management
 *
 * • Admin  : bulk-create exam routine, edit / cancel individual entries, see conflict alerts
 * • Student/Teacher : read-only Exam Schedule card list with countdown indicators
 */

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/useAuth.js";
import { examApi } from "../api/exam.js";
import { academicApi } from "../api/academic.js";
import { apiClient } from "../api/client.js";
import type { ExamEntryItem, CreateExamEntryInput } from "../api/exam.js";
import type { Batch } from "../types/academic.js";
import type { ApiResponse } from "../types/auth.js";

// ─── tiny helpers ──────────────────────────────────────────────────────────────

function parseDateOnly(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(iso: string) {
  const date = parseDateOnly(iso);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function daysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseDateOnly(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function countdownColor(days: number) {
  if (days < 0) return "var(--color-text-muted)";
  if (days <= 2) return "var(--color-error)";
  if (days <= 7) return "var(--color-gold)";
  return "var(--color-success)";
}

function countdownLabel(days: number) {
  if (days < 0) return "Completed";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

// ─── Room list pulled from schedule API ───────────────────────────────────────

interface RoomOption { id: string; roomNumber: string; }

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_ENTRY: CreateExamEntryInput = {
  batchId: "",
  courseName: "",
  roomId: "",
  date: "",
  startTime: "",
  endTime: "",
  teacherId: "",
  topic: "",
};

// ═════════════════════════════════════════════════════════════════════════════
// ExamSchedulePage
// ═════════════════════════════════════════════════════════════════════════════

export function ExamSchedulePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [exams, setExams] = useState<ExamEntryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filter
  const [batchId, setBatchId] = useState(user?.batchId ?? "");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);

  // admin form
  const [entries, setEntries] = useState<CreateExamEntryInput[]>([{ ...EMPTY_ENTRY }]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // edit modal
  const [editTarget, setEditTarget] = useState<ExamEntryItem | null>(null);
  const [editCourseName, setEditCourseName] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // ── Load support data ──────────────────────────────────────────────────────

  useEffect(() => {
    academicApi.getBatches().then(setBatches).catch(console.error);

    apiClient
      .get<ApiResponse<RoomOption[]>>("/rooms")
      .then((r) => setRooms(r.data.data ?? []))
      .catch(console.error);
  }, []);

  // ── Load exams ─────────────────────────────────────────────────────────────

  const loadExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await examApi.list(batchId ? { batchId, limit: 100 } : { limit: 100 });
      setExams(res.data?.exams ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load exam schedule");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ── Admin: row helpers ─────────────────────────────────────────────────────

  const addRow = () => setEntries((prev) => [...prev, { ...EMPTY_ENTRY, batchId }]);

  const removeRow = (idx: number) =>
    setEntries((prev) => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: keyof CreateExamEntryInput, value: string) =>
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );

  // ── Admin: submit ──────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    // Basic client-side guard
    for (const entry of entries) {
      if (!entry.batchId || !entry.courseName || !entry.roomId || !entry.date || !entry.startTime || !entry.endTime) {
        setFormError("Please fill in all required fields for every exam row.");
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await examApi.create({ entries });
      setFormSuccess(
        `${res.data?.length ?? 0} exam entr${(res.data?.length ?? 0) === 1 ? "y" : "ies"} created successfully.`
      );
      setEntries([{ ...EMPTY_ENTRY }]);
      await loadExams();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (e instanceof Error ? e.message : "Failed to create exam routine");
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Admin: cancel exam ─────────────────────────────────────────────────────

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this exam entry? This cannot be undone.")) return;
    try {
      await examApi.cancel(id);
      await loadExams();
    } catch (e: unknown) {
      alert(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to cancel exam entry"
      );
    }
  };

  // ── Edit modal ─────────────────────────────────────────────────────────────

  const openEdit = (exam: ExamEntryItem) => {
    setEditTarget(exam);
    setEditCourseName(exam.topic ?? exam.courseName ?? "");
    setEditRoom(exam.roomId);
    setEditDate(exam.date.slice(0, 10));
    setEditStart(exam.startTime.includes("T") ? exam.startTime.split("T")[1].slice(0, 5) : exam.startTime.slice(0, 5));
    setEditEnd(exam.endTime.includes("T") ? exam.endTime.split("T")[1].slice(0, 5) : exam.endTime.slice(0, 5));
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await examApi.update(editTarget.id, {
        courseName: editCourseName,
        roomId: editRoom,
        date: editDate,
        startTime: editStart,
        endTime: editEnd,
      });
      setEditTarget(null);
      await loadExams();
    } catch (e: unknown) {
      alert(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to update exam entry"
      );
    } finally {
      setEditSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: "#FFFBFA", minHeight: "100vh", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Page Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "1.75rem", color: "#1F2937", margin: 0 }}>
            📋 Semester Final Exam Schedule
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", color: "#6B7280", marginTop: "0.25rem" }}>
            {isAdmin
              ? "Create and manage the semester final examination routine."
              : "Your upcoming final exam schedule for this semester."}
          </p>
        </div>

        {/* ── ADMIN: Create Form ─────────────────────────────────────────── */}
        {isAdmin && (
          <div style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            padding: "1.5rem",
            marginBottom: "2rem",
          }}>
            <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 600, fontSize: "1.1rem", color: "#DC143C", marginTop: 0 }}>
              ➕ Add Exam Entries
            </h2>

            <form onSubmit={handleCreate} noValidate>
              {/* Header row */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 40px", gap: "0.5rem", marginBottom: "0.5rem" }}>
                {["Batch *", "Course Name *", "Room *", "Date *", "Start *", "End *", ""].map((h) => (
                  <span key={h} style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 600, color: "#6B7280", textTransform: "uppercase" }}>
                    {h}
                  </span>
                ))}
              </div>

              {entries.map((entry, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr 40px", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>

                  {/* Batch */}
                  <select id={`exam-batch-${idx}`} value={entry.batchId} onChange={(e) => updateRow(idx, "batchId", e.target.value)} required style={inputStyle}>
                    <option value="">Select batch</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>

                  {/* Course Name */}
                  <input id={`exam-course-${idx}`} type="text" placeholder="e.g. Data Structures" value={entry.courseName} onChange={(e) => updateRow(idx, "courseName", e.target.value)} required style={inputStyle} />

                  {/* Room */}
                  <select id={`exam-room-${idx}`} value={entry.roomId} onChange={(e) => updateRow(idx, "roomId", e.target.value)} required style={inputStyle}>
                    <option value="">Room</option>
                    {rooms.length > 0
                      ? rooms.map((r) => <option key={r.id} value={r.id}>{r.roomNumber}</option>)
                      : <option value="r202-placeholder">R-202</option>}
                  </select>

                  {/* Date */}
                  <input id={`exam-date-${idx}`} type="date" value={entry.date} onChange={(e) => updateRow(idx, "date", e.target.value)} required style={inputStyle} />

                  {/* Start time */}
                  <input id={`exam-start-${idx}`} type="time" value={entry.startTime} onChange={(e) => updateRow(idx, "startTime", e.target.value)} required style={inputStyle} />

                  {/* End time */}
                  <input id={`exam-end-${idx}`} type="time" value={entry.endTime} onChange={(e) => updateRow(idx, "endTime", e.target.value)} required style={inputStyle} />

                  {/* Remove row */}
                  <button type="button" onClick={() => removeRow(idx)} title="Remove row" style={{ background: "none", border: "none", cursor: entries.length > 1 ? "pointer" : "not-allowed", color: "#E11D48", fontSize: "1.1rem", padding: 0 }} disabled={entries.length === 1}>
                    ✕
                  </button>
                </div>
              ))}

              {/* Add row + Submit */}
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" id="exam-add-row" onClick={addRow} style={ghostBtnStyle}>
                  + Add Row
                </button>
                <button type="submit" id="exam-create-submit" disabled={submitting} style={primaryBtnStyle}>
                  {submitting ? "Creating…" : "📤 Publish Exam Routine"}
                </button>
              </div>

              {formError && (
                <div style={alertStyle("#E11D48", "#FFF1F2")} role="alert">
                  ⚠️ {formError}
                </div>
              )}
              {formSuccess && (
                <div style={alertStyle("#16A34A", "#F0FDF4")} role="status">
                  ✅ {formSuccess}
                </div>
              )}
            </form>
          </div>
        )}

        {/* ── Filter bar ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#374151", fontWeight: 500 }}>
            Filter by Batch:
          </label>
          <select id="exam-filter-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} style={{ ...inputStyle, width: "auto", minWidth: 160 }}>
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button id="exam-filter-btn" onClick={loadExams} style={ghostBtnStyle}>
            🔄 Refresh
          </button>
        </div>

        {/* ── Exam Cards ─────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
            Loading exam schedule…
          </div>
        ) : error ? (
          <div style={alertStyle("#E11D48", "#FFF1F2")} role="alert">⚠️ {error}</div>
        ) : exams.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6B7280", fontFamily: "Inter, sans-serif" }}>
            <p style={{ fontSize: "2rem" }}>📋</p>
            <p>No exam schedule published yet.</p>
            {isAdmin && <p style={{ fontSize: "0.85rem" }}>Use the form above to create the semester final exam routine.</p>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
            {exams.map((exam) => {
              const days = daysUntil(exam.date);
              const isPast = days < 0;
              const isCancelled = exam.status === "CANCELLED";

              return (
                <div key={exam.id} style={{
                  background: "var(--color-surface)",
                  borderRadius: 16,
                  boxShadow: "var(--shadow-soft)",
                  padding: "1.25rem",
                  opacity: isPast || isCancelled ? 0.65 : 1,
                  position: "relative",
                  borderTop: `4px solid ${isCancelled ? "var(--color-error)" : "var(--color-primary)"}`,
                }}>
                  {/* Status badge */}
                  {isCancelled && (
                    <span style={{ position: "absolute", top: "1rem", right: "1rem", background: "var(--color-error)", color: "var(--color-surface)", borderRadius: 999, padding: "2px 10px", fontSize: "0.72rem", fontWeight: 700, fontFamily: "Inter, sans-serif" }}>
                      CANCELLED
                    </span>
                  )}

                  {/* Course title */}
                  <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, fontSize: "1rem", color: "#1F2937", margin: "0 0 0.5rem" }}>
                    {exam.topic ?? exam.courseName ?? "Exam"}
                  </h3>

                  {/* Meta grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#374151", marginBottom: "0.75rem" }}>
                    <span>📅 {formatDate(exam.date)}</span>
                    <span>🕐 {formatTime(exam.startTime)} – {formatTime(exam.endTime)}</span>
                    <span>🏫 {exam.roomNumber ?? "TBD"}</span>
                    <span>🎓 {exam.batchName ?? exam.batchId}</span>
                    {exam.teacherName && <span style={{ gridColumn: "span 2" }}>👤 {exam.teacherName}</span>}
                  </div>

                  {/* Countdown pill */}
                  {!isCancelled && (
                    <div style={{
                      display: "inline-block",
                      background: days < 0 ? "rgba(107,114,128,0.12)" : days <= 2 ? "rgba(225,29,72,0.12)" : days <= 7 ? "rgba(245,158,11,0.12)" : "rgba(22,163,74,0.12)",
                      color: countdownColor(days),
                      borderRadius: 999,
                      padding: "3px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      fontFamily: "Inter, sans-serif",
                      marginBottom: isAdmin ? "0.75rem" : 0,
                    }}>
                      ⏱ {countdownLabel(days)}
                    </div>
                  )}

                  {/* Admin actions */}
                  {isAdmin && !isCancelled && (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                      <button id={`exam-edit-${exam.id}`} onClick={() => openEdit(exam)} style={{ ...ghostBtnStyle, flex: 1, justifyContent: "center" }}>
                        ✏️ Edit
                      </button>
                      <button id={`exam-cancel-${exam.id}`} onClick={() => handleCancel(exam.id)} style={{ background: "none", border: "1.5px solid var(--color-error)", color: "var(--color-error)", borderRadius: 8, padding: "0.35rem 0.75rem", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", flex: 1 }}>
                        ✕ Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Edit Modal ─────────────────────────────────────────────────── */}
        {editTarget && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
            <div style={{ background: "var(--color-surface)", borderRadius: 20, padding: "2rem", width: "100%", maxWidth: 480, boxShadow: "var(--shadow-soft)" }}>
              <h3 style={{ fontFamily: "Poppins, sans-serif", fontWeight: 700, color: "#1F2937", marginTop: 0 }}>
                ✏️ Edit Exam Entry
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <label style={labelStyle}>Course Name
                  <input id="edit-exam-course" type="text" value={editCourseName} onChange={(e) => setEditCourseName(e.target.value)} style={inputStyle} />
                </label>
                <label style={labelStyle}>Room
                  <select id="edit-exam-room" value={editRoom} onChange={(e) => setEditRoom(e.target.value)} style={inputStyle}>
                    {rooms.map((r) => <option key={r.id} value={r.id}>{r.roomNumber}</option>)}
                    {rooms.length === 0 && <option value={editRoom}>{editTarget.roomNumber ?? editRoom}</option>}
                  </select>
                </label>
                <label style={labelStyle}>Date
                  <input id="edit-exam-date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} style={inputStyle} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <label style={labelStyle}>Start Time
                    <input id="edit-exam-start" type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={labelStyle}>End Time
                    <input id="edit-exam-end" type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={inputStyle} />
                  </label>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button id="edit-exam-save" onClick={handleEditSave} disabled={editSaving} style={{ ...primaryBtnStyle, flex: 1 }}>
                  {editSaving ? "Saving…" : "💾 Save Changes"}
                </button>
                <button id="edit-exam-cancel" onClick={() => setEditTarget(null)} style={{ ...ghostBtnStyle, flex: 1, justifyContent: "center" }}>
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamSchedulePage;

// ─── Inline style tokens (design-system aligned) ─────────────────────────────

const inputStyle: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontSize: "0.85rem",
  padding: "0.45rem 0.6rem",
  borderRadius: 8,
  border: "1.5px solid var(--color-text-muted)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  background: "var(--color-bg)",
  color: "var(--color-text)",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--color-primary)",
  color: "var(--color-surface)",
  border: "none",
  borderRadius: 10,
  padding: "0.55rem 1.25rem",
  cursor: "pointer",
  fontFamily: "Poppins, sans-serif",
  fontWeight: 600,
  fontSize: "0.88rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  transition: "background 0.15s",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1.5px solid var(--color-primary)",
  color: "var(--color-primary)",
  borderRadius: 10,
  padding: "0.45rem 1rem",
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
  fontWeight: 500,
  fontSize: "0.85rem",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.3rem",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.82rem",
  fontWeight: 500,
  color: "#374151",
};

function alertStyle(color: string, bg: string): React.CSSProperties {
  return {
    marginTop: "0.75rem",
    padding: "0.75rem 1rem",
    borderRadius: 10,
    background: bg,
    color,
    fontFamily: "Inter, sans-serif",
    fontSize: "0.85rem",
    border: `1px solid ${color}30`,
  };
}
