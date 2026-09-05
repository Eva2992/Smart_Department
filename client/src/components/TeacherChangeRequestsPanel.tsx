import { useState, useEffect, useCallback } from "react";
import {
  type ClassChangeRequest,
  getChangeRequests,
  reviewChangeRequest,
} from "../api/scheduleApi";
import { useAuth } from "../context/useAuth.js";

interface TeacherChangeRequestsPanelProps {
  rooms: Array<{ id: string; roomNumber: string; type: string }>;
  onRequestReviewed?: () => void;
}

export function TeacherChangeRequestsPanel({
  rooms,
  onRequestReviewed,
}: TeacherChangeRequestsPanelProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ClassChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "DENIED">(
    "ALL"
  );
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Review modal / inline state
  const [denialModalRequest, setDenialModalRequest] = useState<ClassChangeRequest | null>(null);
  const [denialReason, setDenialReason] = useState("");

  const [rescheduleModalRequest, setRescheduleModalRequest] = useState<ClassChangeRequest | null>(
    null
  );
  const [modDate, setModDate] = useState("");
  const [modStartTime, setModStartTime] = useState("10:00");
  const [modEndTime, setModEndTime] = useState("11:30");
  const [modRoomId, setModRoomId] = useState("");

  const isTeacherOrAdmin = user?.role === "TEACHER" || user?.role === "ADMIN";

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const data = await getChangeRequests({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      setRequests(data);
    } catch (err: unknown) {
      console.error("Failed to load change requests:", err);
      setActionError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApproveCancel = async (request: ClassChangeRequest) => {
    setReviewingId(request.id);
    setActionError(null);
    try {
      await reviewChangeRequest(request.id, { action: "APPROVE" });
      await fetchRequests();
      onRequestReviewed?.();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setReviewingId(null);
    }
  };

  const openDenialModal = (request: ClassChangeRequest) => {
    setDenialModalRequest(request);
    setDenialReason("");
  };

  const handleConfirmDeny = async () => {
    if (!denialModalRequest) return;
    setReviewingId(denialModalRequest.id);
    setActionError(null);
    try {
      await reviewChangeRequest(denialModalRequest.id, {
        action: "DENY",
        denialReason: denialReason.trim() || undefined,
      });
      setDenialModalRequest(null);
      await fetchRequests();
      onRequestReviewed?.();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to deny request");
    } finally {
      setReviewingId(null);
    }
  };

  const openRescheduleReviewModal = (request: ClassChangeRequest) => {
    setRescheduleModalRequest(request);
    const initialDate = request.preferredDate
      ? request.preferredDate.split("T")[0]
      : request.scheduleEntry?.date
        ? request.scheduleEntry.date.split("T")[0]
        : new Date().toISOString().split("T")[0];

    const initialStart = request.preferredStartTime
      ? new Date(request.preferredStartTime).toISOString().substring(11, 16)
      : "10:00";

    const initialEnd = request.preferredEndTime
      ? new Date(request.preferredEndTime).toISOString().substring(11, 16)
      : "11:30";

    setModDate(initialDate);
    setModStartTime(initialStart);
    setModEndTime(initialEnd);
    setModRoomId(request.preferredRoomId || request.scheduleEntry?.roomId || rooms[0]?.id || "");
  };

  const handleConfirmApproveReschedule = async () => {
    if (!rescheduleModalRequest) return;
    setReviewingId(rescheduleModalRequest.id);
    setActionError(null);
    try {
      await reviewChangeRequest(rescheduleModalRequest.id, {
        action: "APPROVE",
        modifiedDate: modDate,
        modifiedStartTime: modStartTime,
        modifiedEndTime: modEndTime,
        modifiedRoomId: modRoomId,
      });
      setRescheduleModalRequest(null);
      await fetchRequests();
      onRequestReviewed?.();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to approve reschedule");
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
        <div>
          <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] flex items-center gap-2">
            <span>📩 Class Change Requests</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-[#DC143C] font-semibold">
              {requests.length}
            </span>
          </h3>
          <p className="text-xs text-[#6B7280]">
            {isTeacherOrAdmin
              ? "Review and act on student cancellation and reschedule requests (FR-17 & FR-18)."
              : "Track the status of cancellation and reschedule requests submitted for your batch."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["ALL", "PENDING", "APPROVED", "DENIED"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === status
                  ? "bg-[#DC143C] text-white shadow-xs"
                  : "bg-gray-100 text-[#6B7280] hover:bg-gray-200"
              }`}
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchRequests}
            className="p-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 hover:bg-gray-50 text-[#1F2937] cursor-pointer"
            title="Refresh requests"
          >
            🔄
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-[#6B7280]">
          <div className="w-8 h-8 border-4 border-[#DC143C] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-medium">Loading change requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center bg-white border border-gray-100 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] text-[#6B7280]">
          <span className="text-4xl">📭</span>
          <h3 className="text-sm font-bold text-[#1F2937] mt-2 font-[Poppins]">
            No Change Requests Found
          </h3>
          <p className="text-xs text-[#6B7280] mt-1">
            There are no {statusFilter !== "ALL" ? statusFilter.toLowerCase() : ""} requests at this
            time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map((req) => {
            const entryDate = req.scheduleEntry?.date ? req.scheduleEntry.date.split("T")[0] : "";
            const isPending = req.status === "PENDING";

            return (
              <div
                key={req.id}
                className="p-5 bg-white border border-gray-100 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.06)] flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        req.type === "CANCEL"
                          ? "bg-rose-100 text-[#E11D48] border border-rose-200"
                          : "bg-amber-100 text-amber-800 border border-amber-200"
                      }`}
                    >
                      {req.type === "CANCEL" ? "⚠️ Cancellation Request" : "📅 Reschedule Request"}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        req.status === "PENDING"
                          ? "bg-amber-50 text-[#F59E0B] border border-amber-300 animate-pulse"
                          : req.status === "APPROVED"
                            ? "bg-emerald-50 text-[#16A34A] border border-emerald-300"
                            : "bg-rose-50 text-[#E11D48] border border-rose-300"
                      }`}
                    >
                      {req.status}
                    </span>
                  </div>

                  {/* Course & Class Slot info */}
                  <h4 className="text-sm font-bold text-[#1F2937] font-[Poppins]">
                    {req.scheduleEntry?.course?.code || "Class"} —{" "}
                    {req.scheduleEntry?.course?.name || "Session"}
                  </h4>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    Batch: <strong>{req.scheduleEntry?.batch?.name || "N/A"}</strong> | Slot:{" "}
                    <strong>{entryDate}</strong> (Room{" "}
                    {req.scheduleEntry?.room?.roomNumber || "TBD"})
                  </p>

                  {/* Requester & Reason */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs space-y-1.5">
                    <div>
                      <span className="text-[#6B7280]">Requested by:</span>{" "}
                      <strong className="text-[#1F2937]">
                        {req.requestedBy?.name || "Student"}
                      </strong>{" "}
                      <span className="text-[10px] text-[#6B7280]">
                        ({req.requestedBy?.role || "STUDENT"})
                      </span>
                    </div>
                    <div>
                      <span className="text-[#6B7280]">Reason:</span>{" "}
                      <span className="text-[#1F2937] italic">"{req.reason}"</span>
                    </div>

                    {req.type === "RESCHEDULE" && req.preferredDate && (
                      <div className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200 mt-2">
                        Preferred slot: <strong>{req.preferredDate.split("T")[0]}</strong>
                        {req.preferredStartTime &&
                          ` at ${new Date(req.preferredStartTime).toISOString().substring(11, 16)}`}
                      </div>
                    )}

                    {req.status === "DENIED" && req.denialReason && (
                      <div className="text-[11px] text-[#E11D48] bg-rose-50 p-2 rounded-lg border border-rose-200 mt-2">
                        Denial feedback: <strong>"{req.denialReason}"</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions for Teachers / Admins on Pending Requests */}
                {isTeacherOrAdmin && isPending && (
                  <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                    {req.type === "CANCEL" ? (
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => handleApproveCancel(req)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-[#16A34A] hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {reviewingId === req.id ? "Approving..." : "✓ Approve Cancellation"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={reviewingId === req.id}
                        onClick={() => openRescheduleReviewModal(req)}
                        className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        {reviewingId === req.id ? "Processing..." : "✓ Review & Reschedule"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={reviewingId === req.id}
                      onClick={() => openDenialModal(req)}
                      className="py-1.5 px-3.5 rounded-xl text-xs font-bold text-[#E11D48] hover:bg-rose-50 border border-rose-200 transition cursor-pointer disabled:opacity-50"
                    >
                      ✕ Deny
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Denial Feedback Modal */}
      {denialModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-sm w-full p-6 text-[#1F2937] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
            <h3 className="text-base font-bold text-[#E11D48] font-[Poppins] mb-2">
              ✕ Deny Change Request
            </h3>
            <p className="text-xs text-[#6B7280] mb-3">
              The student will be notified of this denial. You can optionally include feedback or
              explanation.
            </p>

            <textarea
              rows={3}
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="e.g. Class syllabus is behind schedule; cannot cancel this session."
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C] resize-none"
            ></textarea>

            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDenialModalRequest(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-gray-100"
              >
                Back
              </button>
              <button
                type="button"
                disabled={reviewingId === denialModalRequest.id}
                onClick={handleConfirmDeny}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#E11D48] hover:bg-rose-700 text-white"
              >
                {reviewingId === denialModalRequest.id ? "Denying..." : "Confirm Denial"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Confirmation / Modification Modal */}
      {rescheduleModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl max-w-md w-full p-6 text-[#1F2937] shadow-[0_10px_25px_rgba(0,0,0,0.1)]">
            <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-1">
              📅 Confirm Reschedule Slot
            </h3>
            <p className="text-xs text-[#6B7280] mb-3">
              Accept proposed slot or adjust date, time, and room before approving (subject to 3-way
              conflict detection).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={modDate}
                  onChange={(e) => setModDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={modStartTime}
                    onChange={(e) => setModStartTime(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={modEndTime}
                    onChange={(e) => setModEndTime(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1">
                  Room
                </label>
                <select
                  value={modRoomId}
                  onChange={(e) => setModRoomId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.roomNumber} ({r.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setRescheduleModalRequest(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#6B7280] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reviewingId === rescheduleModalRequest.id}
                onClick={handleConfirmApproveReschedule}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#DC143C] hover:bg-[#B01030] text-white"
              >
                {reviewingId === rescheduleModalRequest.id
                  ? "Approving..."
                  : "Approve & Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
