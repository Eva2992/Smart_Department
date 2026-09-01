import { useState, useEffect, useCallback } from "react";
import { assignmentApi } from "../../api/assessments.js";
import { Alert } from "../Alert.js";
import type { Assignment } from "../../types/assessments.js";

// ── Type-safe error message extractor ────────────────────────────────────────
function getApiMessage(err: unknown, fallback: string): string {
  if (
    err !== null &&
    typeof err === "object" &&
    "response" in err &&
    err.response !== null &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data !== null &&
    typeof err.response.data === "object" &&
    "message" in err.response.data &&
    typeof (err.response.data as Record<string, unknown>).message === "string"
  ) {
    return (err.response.data as Record<string, unknown>).message as string;
  }
  return fallback;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Lightweight confirm dialog (replaces browser confirm/alert) ───────────────
interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
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
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-error hover:bg-error/80 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AssignmentsPanel() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);

  // Confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // TODO: replace hardcoded IDs with values from the auth context once wired up
  const teacherId = "teacher-1";
  const batchId = "batch-1";
  const courseId = "course-1";

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // batchId is required by the server validator — must always be passed
      const res = await assignmentApi.list(batchId);
      setAssignments(res.data || []);
    } catch (err: unknown) {
      setError(getApiMessage(err, "Failed to load assignments"));
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await assignmentApi.delete(deleteTarget, teacherId);
      setDeleteTarget(null);
      loadAssignments();
    } catch (err: unknown) {
      setError(getApiMessage(err, "Failed to delete assignment"));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-text">Assignments</h2>
          <p className="text-sm text-text-muted mt-1">Manage course assignments and deadlines.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-primary text-surface px-4 py-2 rounded-lg font-medium shadow-soft hover:bg-primary-dark transition-colors"
        >
          + Create Assignment
        </button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {loading ? (
        <div className="text-text-muted animate-pulse">Loading assignments...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.length === 0 ? (
            <div className="col-span-full py-12 text-center text-text-muted bg-surface shadow-soft rounded-[20px]">
              No assignments found.
            </div>
          ) : (
            assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="bg-surface shadow-soft rounded-[20px] p-6 border border-gray-100 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-text-muted">
                    {assignment.course?.code || "COURSE"}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                    Due {fmtDate(assignment.dueDate)}
                  </span>
                </div>

                <h3 className="font-heading text-lg font-semibold text-text mb-2">
                  {assignment.title}
                </h3>
                <p className="text-sm text-text-muted flex-grow mb-6 line-clamp-3">
                  {assignment.description}
                </p>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 mt-auto">
                  <button
                    onClick={() => setEditTarget(assignment)}
                    className="text-sm font-medium text-text-muted hover:text-primary transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(assignment.id)}
                    className="text-sm font-medium text-error hover:text-error/80 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <ConfirmDialog
          message="Are you sure you want to delete this assignment? This cannot be undone."
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <AssignmentFormModal
          mode="create"
          teacherId={teacherId}
          batchId={batchId}
          courseId={courseId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadAssignments();
          }}
        />
      )}

      {/* EDIT MODAL */}
      {editTarget && (
        <AssignmentFormModal
          mode="edit"
          assignment={editTarget}
          teacherId={teacherId}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            loadAssignments();
          }}
        />
      )}
    </div>
  );
}

// ── Form Modal ────────────────────────────────────────────────────────────────

interface FormProps {
  mode: "create" | "edit";
  assignment?: Assignment;
  teacherId: string;
  batchId?: string;
  courseId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function AssignmentFormModal({
  mode,
  assignment,
  teacherId,
  batchId,
  courseId,
  onClose,
  onSuccess,
}: FormProps) {
  const [title, setTitle] = useState(assignment?.title || "");
  const [description, setDescription] = useState(assignment?.description || "");
  // Only pre-fill dueDate in edit mode; leave blank in create mode so the
  // user must consciously pick a future date
  const [dueDate, setDueDate] = useState(
    assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : ""
  );
  const [dueDateChanged, setDueDateChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "create") {
        await assignmentApi.create({
          teacherId,
          batchId: batchId!,
          courseId: courseId!,
          title,
          description,
          dueDate: new Date(dueDate).toISOString(),
        });
      } else {
        await assignmentApi.update(assignment!.id, {
          teacherId,
          title,
          description,
          // Fix #7: only send dueDate if the user actually changed it.
          // Sending the old dueDate on a past-due assignment would cause a 400.
          ...(dueDateChanged && dueDate ? { dueDate: new Date(dueDate).toISOString() } : {}),
        });
      }
      onSuccess();
    } catch (err: unknown) {
      setError(getApiMessage(err, "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-[20px] shadow-soft overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-heading text-lg font-semibold text-text">
            {mode === "create" ? "Create Assignment" : "Edit Assignment"}
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Title</label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              placeholder="e.g. Project Phase 1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
              placeholder="Assignment details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Due Date &amp; Time
              {mode === "edit" && !dueDateChanged && (
                <span className="text-text-muted font-normal ml-2 text-xs">
                  (leave unchanged to keep current)
                </span>
              )}
            </label>
            <input
              required={mode === "create"}
              type="datetime-local"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                setDueDateChanged(true);
              }}
              className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm"
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
              disabled={submitting}
              className="bg-primary text-surface px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
