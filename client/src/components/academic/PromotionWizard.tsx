import React, { useState } from "react";
import type { Batch, PromotionRequest } from "../../types/academic.js";

interface PromotionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  batch: Batch;
  pendingRequest?: PromotionRequest | null;
  onPromote: (batchId: string, payload: {
    promotionRequestId?: string;
    nextSemesterName?: string;
    nextSemesterStartDate?: string;
    nextSemesterEndDate?: string;
    isGraduation?: boolean;
  }) => Promise<void>;
  onRejectRequest?: (requestId: string, reason: string) => Promise<void>;
}

export const PromotionWizard: React.FC<PromotionWizardProps> = ({
  isOpen,
  onClose,
  batch,
  pendingRequest,
  onPromote,
  onRejectRequest,
}) => {
  const [actionType, setActionType] = useState<"NEXT_SEMESTER" | "GRADUATE">("NEXT_SEMESTER");
  const [nextSemesterName, setNextSemesterName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (actionType === "NEXT_SEMESTER" && !nextSemesterName.trim()) {
      setError("Please specify the next sequential semester name (e.g., '3rd Year 2nd Semester')");
      return;
    }

    setIsSubmitting(true);
    try {
      await onPromote(batch.id, {
        promotionRequestId: pendingRequest?.id,
        isGraduation: actionType === "GRADUATE",
        nextSemesterName: actionType === "NEXT_SEMESTER" ? nextSemesterName : undefined,
        nextSemesterStartDate: actionType === "NEXT_SEMESTER" && startDate ? startDate : undefined,
        nextSemesterEndDate: actionType === "NEXT_SEMESTER" && endDate ? endDate : undefined,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
          ? err.message
          : "Promotion processing failed";
      setError(msg || "Promotion processing failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!pendingRequest || !onRejectRequest) return;
    if (!rejectReason.trim()) {
      setError("Please provide a reason for rejecting the promotion request");
      return;
    }

    setIsSubmitting(true);
    try {
      await onRejectRequest(pendingRequest.id, rejectReason);
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
          ? err.message
          : "Failed to reject promotion request";
      setError(msg || "Failed to reject promotion request");
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
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FFFBFA]">
          <div>
            <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wider">
              Promotion Lifecycle (FR-07, FR-08)
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1F2937]">
              Batch Promotion Wizard • {batch.name} Batch
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close promotion wizard"
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-[#E11D48] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* ADR-0004 CR Reset Notice Alert Banner */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <svg className="w-4 h-4 text-[#F59E0B] shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              CR Role Reset Rule (ADR-0004)
            </div>
            <p className="leading-relaxed">
              Upon executing promotion, all active Class Representative (CR) accounts for Batch{" "}
              <strong>{batch.name}</strong> will be automatically reset to <strong>STUDENT</strong> role.
              The Department Admin or Faculty must explicitly confirm or reassign the CR for the new semester.
            </p>
          </div>

          {/* Pending Request Banner */}
          {pendingRequest && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
              <span className="font-bold">Pending CR Request:</span> Submitted by{" "}
              <strong>{pendingRequest.requestedBy?.name}</strong> ({pendingRequest.requestedBy?.universityId || "CR"}).
              {pendingRequest.reason && <p className="mt-1 italic text-blue-800">"{pendingRequest.reason}"</p>}
            </div>
          )}

          {!showRejectForm ? (
            <form onSubmit={handlePromoteSubmit} className="space-y-4">
              {/* Option Radio Cards */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Select Promotion Action *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      actionType === "NEXT_SEMESTER"
                        ? "border-[#DC143C] bg-rose-50/40 ring-1 ring-[#DC143C]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="actionType"
                        value="NEXT_SEMESTER"
                        checked={actionType === "NEXT_SEMESTER"}
                        onChange={() => setActionType("NEXT_SEMESTER")}
                        className="text-[#DC143C] focus:ring-[#DC143C]"
                      />
                      <span className="text-xs font-bold text-gray-900">Next Semester</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Advance batch students to the next sequential term and archive previous routine.
                    </p>
                  </label>

                  <label
                    className={`cursor-pointer p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      actionType === "GRADUATE"
                        ? "border-[#DC143C] bg-rose-50/40 ring-1 ring-[#DC143C]"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        name="actionType"
                        value="GRADUATE"
                        checked={actionType === "GRADUATE"}
                        onChange={() => setActionType("GRADUATE")}
                        className="text-[#DC143C] focus:ring-[#DC143C]"
                      />
                      <span className="text-xs font-bold text-gray-900">Graduation</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Mark batch as COMPLETED and all enrolled students as GRADUATED.
                    </p>
                  </label>
                </div>
              </div>

              {actionType === "NEXT_SEMESTER" && (
                <div className="space-y-3.5 pt-2">
                  <div>
                    <label htmlFor="next-semester-name" className="block text-xs font-bold text-gray-700 mb-1">
                      Next Semester Name *
                    </label>
                    <input
                      id="next-semester-name"
                      type="text"
                      value={nextSemesterName}
                      onChange={(e) => setNextSemesterName(e.target.value)}
                      placeholder="e.g. 3rd Year 1st Semester"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="next-start-date" className="block text-xs font-bold text-gray-700 mb-1">
                        Estimated Start
                      </label>
                      <input
                        id="next-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
                      />
                    </div>
                    <div>
                      <label htmlFor="next-end-date" className="block text-xs font-bold text-gray-700 mb-1">
                        Estimated End
                      </label>
                      <input
                        id="next-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                {pendingRequest ? (
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    Reject Request...
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
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
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isSubmitting
                      ? "Promoting..."
                      : actionType === "GRADUATE"
                      ? "Complete & Graduate Batch"
                      : "Execute Promotion"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Rejection Form */
            <div className="space-y-4">
              <div>
                <label htmlFor="reject-reason" className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Lab examination results or pending retake exams must be submitted before promotion."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  Back to Promote
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#E11D48] hover:bg-rose-700 text-white disabled:opacity-50"
                >
                  {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
