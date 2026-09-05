import React, { useState, useEffect } from "react";
import { assignmentApi } from "../../api/assessments.js";
import type { Assignment, AssignmentSubmission } from "../../types/assessments.js";
import { Alert } from "../Alert.js";

function getErrorMessage(err: unknown, fallback: string): string {
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

interface AssignmentSubmissionModalProps {
  assignment: Assignment;
  isTeacherOrAdmin: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const AssignmentSubmissionModal: React.FC<AssignmentSubmissionModalProps> = ({
  assignment,
  isTeacherOrAdmin,
  onClose,
  onSubmitted,
}) => {
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Submissions list for teachers/admins or student's own submission
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    async function fetchSubmissions() {
      setLoadingSubmissions(true);
      try {
        const res = await assignmentApi.getSubmissions(assignment.id);
        setSubmissions(res.data || []);
        if (!isTeacherOrAdmin && res.data && res.data.length > 0) {
          const mySub = res.data[0];
          setSubmissionUrl(mySub.submissionUrl || "");
          setNotes(mySub.notes || "");
        }
      } catch (err: unknown) {
        console.error("Failed to load submissions:", err);
      } finally {
        setLoadingSubmissions(false);
      }
    }
    fetchSubmissions();
  }, [assignment.id, isTeacherOrAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionUrl.trim() && !file) {
      setError("Please provide either a submission URL or an attached document file.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        if (submissionUrl.trim()) formData.append("submissionUrl", submissionUrl.trim());
        if (notes.trim()) formData.append("notes", notes.trim());
        await assignmentApi.submit(assignment.id, formData);
      } else {
        await assignmentApi.submit(assignment.id, {
          submissionUrl: submissionUrl.trim(),
          notes: notes.trim() || undefined,
        });
      }

      setSuccess("Assignment submitted successfully!");
      if (onSubmitted) onSubmitted();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to submit assignment"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl p-6 border border-gray-100 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start pb-4 border-b border-gray-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#DC143C] bg-rose-50 px-2 py-0.5 rounded-md">
              {assignment.course?.code || "Assignment"}
            </span>
            <h3 className="text-lg font-bold text-[#1F2937] mt-1">{assignment.title}</h3>
            <p className="text-xs text-gray-500">
              Due: {new Date(assignment.dueDate).toLocaleDateString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="py-4 overflow-y-auto flex-1 space-y-4">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

          {/* Teacher / Admin View: Submissions Roster */}
          {isTeacherOrAdmin ? (
            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                Student Submissions ({submissions.length})
              </h4>
              {loadingSubmissions ? (
                <div className="text-xs text-gray-400 text-center py-6">Loading submissions...</div>
              ) : submissions.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-8 bg-gray-50 rounded-xl">
                  No student submissions received yet.
                </div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                      <tr>
                        <th className="py-2.5 px-3">Student</th>
                        <th className="py-2.5 px-3">Submitted At</th>
                        <th className="py-2.5 px-3 text-right">Artifact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50/50">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-gray-900">
                              {sub.student?.name || "Student"}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {sub.student?.universityId || sub.student?.email}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                            {new Date(sub.submittedAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right space-x-2">
                            {sub.submissionUrl && (
                              <a
                                href={sub.submissionUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                              >
                                Link
                              </a>
                            )}
                            {sub.fileUrl && (
                              <a
                                href={sub.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                File
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Student View: Submission Form (Dual-mode: URL + File Attachment, FR-21, ADR-0005) */
            <form onSubmit={handleSubmit} className="space-y-4">
              {submissions.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                  <span className="font-bold">✓ Submitted</span> on{" "}
                  {new Date(submissions[0].submittedAt).toLocaleString()}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  External URL / Repository Link (e.g. GitHub, Google Drive)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/..."
                  value={submissionUrl}
                  onChange={(e) => setSubmissionUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Or Upload Direct Document (PDF, DOCX, ZIP up to 50MB)
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Submission Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Any additional remarks or instructions for the teacher..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submitting
                    ? "Submitting..."
                    : submissions.length > 0
                      ? "Update Submission"
                      : "Submit Assignment"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
