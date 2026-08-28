import React, { useState } from "react";
import type { Batch, StudentSummary, StudentStatus, Role } from "../../types/academic.js";

interface StudentOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentSummary | null;
  batches: Batch[];
  onSubmit: (
    studentId: string,
    payload: {
      batchId?: string;
      studentStatus?: StudentStatus;
      role?: Role;
      reason?: string;
    }
  ) => Promise<void>;
}

export const StudentOverrideModal: React.FC<StudentOverrideModalProps> = ({
  isOpen,
  onClose,
  student,
  batches,
  onSubmit,
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState(student?.batchId || "");
  const [selectedStatus, setSelectedStatus] = useState<StudentStatus>(
    student?.studentStatus || "ACTIVE"
  );
  const [selectedRole, setSelectedRole] = useState<Role>(student?.role || "STUDENT");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setIsSubmitting(true);
    try {
      await onSubmit(student.id, {
        batchId: selectedBatchId || undefined,
        studentStatus: selectedStatus,
        role: selectedRole,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : "Failed to update student semester status";
      setError(msg || "Failed to update student");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FFFBFA]">
          <div>
            <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wider">
              Student Status Override (FR-09)
            </span>
            <h2 className="text-lg font-extrabold text-[#1F2937]">
              Override Student Semester / Status
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close override modal"
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-[#E11D48]"
            >
              {error}
            </div>
          )}

          {/* Student Profile Snapshot */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Student Name:</span>
              <span className="font-bold text-gray-900">{student.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">University ID:</span>
              <span className="font-semibold text-gray-900">{student.universityId || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Batch:</span>
              <span className="font-semibold text-gray-900">
                {student.batch?.name ? `${student.batch.name} Batch` : "None"}
              </span>
            </div>
          </div>

          {/* Target Batch Selector */}
          <div>
            <label htmlFor="override-batch" className="block text-xs font-bold text-gray-700 mb-1">
              Assigned Batch
            </label>
            <select
              id="override-batch"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] bg-white"
            >
              <option value="">-- Unassigned --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} Batch ({b.program})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Student Status */}
            <div>
              <label
                htmlFor="student-status-select"
                className="block text-xs font-bold text-gray-700 mb-1"
              >
                Student Status *
              </label>
              <select
                id="student-status-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as StudentStatus)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="PROMOTED">PROMOTED</option>
                <option value="DEMOTED">DEMOTED</option>
                <option value="DROPOUT">DROPOUT</option>
                <option value="GRADUATED">GRADUATED</option>
              </select>
            </div>

            {/* Role Assignment */}
            <div>
              <label htmlFor="role-select" className="block text-xs font-bold text-gray-700 mb-1">
                User Role *
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] bg-white"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="CR">CLASS REPRESENTATIVE (CR)</option>
              </select>
            </div>
          </div>

          {/* Audit Reason */}
          <div>
            <label htmlFor="override-reason" className="block text-xs font-bold text-gray-700 mb-1">
              Reason for Override (Audit Log)
            </label>
            <textarea
              id="override-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Readmission following medical leave, or demotion due to retake policy."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Override"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
