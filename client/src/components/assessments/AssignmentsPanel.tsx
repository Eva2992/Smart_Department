import { useState, useEffect, useCallback } from "react";
import { assignmentApi } from "../../api/assessments.js";
import type { Assignment, CreateAssignmentPayload, UpdateAssignmentPayload } from "../../types/assessments.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export function AssignmentsPanel() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forms State
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Assignment | null>(null);

  // Hardcoded for now until proper auth context provides this
  const teacherId = "teacher-1";
  const batchId = "batch-1";
  const courseId = "course-1";

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assignmentApi.list();
      setAssignments(res.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    try {
      await assignmentApi.delete(id, teacherId);
      loadAssignments();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete assignment");
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

      {error && (
        <div className="bg-error/10 text-error p-4 rounded-md text-sm font-medium">
          {error}
        </div>
      )}

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
                    onClick={() => handleDelete(assignment.id)}
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

function AssignmentFormModal({ mode, assignment, teacherId, batchId, courseId, onClose, onSuccess }: FormProps) {
  const [title, setTitle] = useState(assignment?.title || "");
  const [description, setDescription] = useState(assignment?.description || "");
  const [dueDate, setDueDate] = useState(
    assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : ""
  );
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
          dueDate: new Date(dueDate).toISOString(),
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred");
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
          <button onClick={onClose} className="text-text-muted hover:text-text">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-error/10 text-error p-3 rounded text-sm">{error}</div>
          )}

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
            <label className="block text-sm font-medium text-text mb-1">Due Date & Time</label>
            <input
              required
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
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
