import React, { useState, useEffect, useCallback } from "react";
import { academicApi } from "../api/academic.js";
import { BatchCard } from "../components/academic/BatchCard.js";
import { SemesterModal } from "../components/academic/SemesterModal.js";
import { PromotionWizard } from "../components/academic/PromotionWizard.js";
import { StudentOverrideModal } from "../components/academic/StudentOverrideModal.js";
import type {
  Batch,
  PromotionRequest,
  StudentSummary,
  Program,
  CourseInput,
  StudentStatus,
  Role,
} from "../types/academic.js";

export const AdminBatchManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"batches" | "promotions" | "students">("batches");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [studentTotal, setStudentTotal] = useState(0);
  const [studentPage, setStudentPage] = useState(1);
  const [studentSearch, setStudentSearch] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Modals state
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [selectedBatchForSemester, setSelectedBatchForSemester] = useState<Batch | null>(null);

  const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState(false);
  const [selectedBatchForPromotion, setSelectedBatchForPromotion] = useState<Batch | null>(null);
  const [selectedRequestForPromotion, setSelectedRequestForPromotion] =
    useState<PromotionRequest | null>(null);

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [selectedStudentForOverride, setSelectedStudentForOverride] =
    useState<StudentSummary | null>(null);

  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchProgram, setNewBatchProgram] = useState<Program>("HONOURS");
  const [batchModalError, setBatchModalError] = useState<string | null>(null);

  // Refresh data on filter/page change
  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const [batchesData, promotionsData, studentsData] = await Promise.all([
          academicApi.getBatches({
            program: programFilter !== "ALL" ? (programFilter as Program) : undefined,
          }),
          academicApi.getPromotionRequests(),
          academicApi.searchStudents({
            q: studentSearch.trim() || undefined,
            page: studentPage,
            limit: 10,
          }),
        ]);

        if (isMounted) {
          setBatches(batchesData);
          setPromotionRequests(promotionsData);
          if (studentsData) {
            setStudents(studentsData.students);
            setStudentTotal(studentsData.total);
          }
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setFeedback({ type: "error", message: "Failed to load academic data" });
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [programFilter, studentSearch, studentPage]);

  const reloadData = useCallback(async () => {
    try {
      const [batchesData, promotionsData, studentsData] = await Promise.all([
        academicApi.getBatches({
          program: programFilter !== "ALL" ? (programFilter as Program) : undefined,
        }),
        academicApi.getPromotionRequests(),
        academicApi.searchStudents({
          q: studentSearch.trim() || undefined,
          page: studentPage,
          limit: 10,
        }),
      ]);
      setBatches(batchesData);
      setPromotionRequests(promotionsData);
      if (studentsData) {
        setStudents(studentsData.students);
        setStudentTotal(studentsData.total);
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to refresh data" });
    }
  }, [programFilter, studentSearch, studentPage]);

  // Handle Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;

    setBatchModalError(null);
    try {
      await academicApi.createBatch({
        name: newBatchName.trim(),
        program: newBatchProgram,
      });
      setFeedback({ type: "success", message: `Batch '${newBatchName}' created successfully!` });
      setIsNewBatchModalOpen(false);
      setNewBatchName("");
      reloadData();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to create batch";
      setBatchModalError(msg || "Failed to create batch");
    }
  };

  // Handle Create Semester
  const handleCreateSemesterSubmit = async (payload: {
    name: string;
    batchId: string;
    startDate: string;
    endDate: string;
    courses: CourseInput[];
  }) => {
    await academicApi.createSemester(payload);
    setFeedback({
      type: "success",
      message: `Semester '${payload.name}' created with ${payload.courses.length} courses assigned!`,
    });
    reloadData();
  };

  // Handle Execute Promotion
  const handlePromoteBatchSubmit = async (
    batchId: string,
    payload: {
      promotionRequestId?: string;
      nextSemesterName?: string;
      nextSemesterStartDate?: string;
      nextSemesterEndDate?: string;
      isGraduation?: boolean;
    }
  ) => {
    const res = await academicApi.promoteBatch(batchId, payload);
    setFeedback({
      type: "success",
      message: res.message || "Batch promotion executed successfully. CR roles reset to Student.",
    });
    reloadData();
  };

  // Handle Reject Promotion Request
  const handleRejectPromotion = async (requestId: string, reason: string) => {
    await academicApi.rejectPromotion(requestId, reason);
    setFeedback({ type: "success", message: "Promotion request rejected with feedback to CR." });
    reloadData();
  };

  // Handle Override Student
  const handleOverrideStudentSubmit = async (
    studentId: string,
    payload: {
      batchId?: string;
      studentStatus?: StudentStatus;
      role?: Role;
      reason?: string;
    }
  ) => {
    await academicApi.overrideSemester(studentId, payload);
    setFeedback({ type: "success", message: "Student academic status updated successfully!" });
    reloadData();
  };

  const pendingRequestsCount = promotionRequests.filter((r) => r.status === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#FFFBFA] text-gray-900 pb-16">
      {/* Top Banner */}
      <div className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md bg-rose-100 text-[#DC143C]">
                  Department Administration
                </span>
                <span className="text-xs text-gray-500">• JU CSE Smart Department</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#1F2937] tracking-tight mt-1">
                Batch & Semester Lifecycle Manager
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNewBatchModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Batch
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedBatchForSemester(batches[0] || null);
                  setIsSemesterModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                New Semester
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-gray-100 -mb-5">
            <button
              type="button"
              onClick={() => setActiveTab("batches")}
              className={`pb-3 px-3 text-xs font-bold tracking-wide transition-all border-b-2 ${
                activeTab === "batches"
                  ? "border-[#DC143C] text-[#DC143C]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Academic Batches ({batches.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("promotions")}
              className={`pb-3 px-3 text-xs font-bold tracking-wide transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "promotions"
                  ? "border-[#DC143C] text-[#DC143C]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Promotion Requests
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#F59E0B] text-white text-[10px] font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("students")}
              className={`pb-3 px-3 text-xs font-bold tracking-wide transition-all border-b-2 ${
                activeTab === "students"
                  ? "border-[#DC143C] text-[#DC143C]"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              Student Roster &amp; Overrides
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Feedback Alert */}
        {feedback && (
          <div
            role="alert"
            className={`p-4 rounded-xl mb-6 text-xs flex items-center justify-between shadow-xs ${
              feedback.type === "success"
                ? "bg-emerald-50 text-[#16A34A] border border-emerald-200"
                : "bg-rose-50 text-[#E11D48] border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-semibold">{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-gray-400 hover:text-gray-600 font-bold text-sm"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab 1: Batches Grid */}
        {activeTab === "batches" && (
          <div>
            {/* Filter Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <span>Filter Program:</span>
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium focus:outline-none focus:border-[#DC143C]"
                >
                  <option value="ALL">All Programs</option>
                  <option value="HONOURS">B.Sc. (Honours)</option>
                  <option value="MASTERS">M.Sc. (Masters)</option>
                  <option value="PMSCS">PMSCS</option>
                  <option value="PHD">Ph.D.</option>
                </select>
              </div>

              <div className="text-xs text-gray-500">
                Showing <strong>{batches.length}</strong> academic batches
              </div>
            </div>

            {/* Batch Cards Grid */}
            {isLoading ? (
              <div className="py-20 text-center text-gray-400 text-sm">
                Loading academic batches...
              </div>
            ) : batches.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/70">
                <p className="text-sm font-semibold text-gray-600 mb-3">
                  No academic batches configured yet.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#DC143C] text-white hover:bg-[#B01030]"
                >
                  Create First Batch
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.map((batch) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    onCreateSemester={(b) => {
                      setSelectedBatchForSemester(b);
                      setIsSemesterModalOpen(true);
                    }}
                    onPromote={(b) => {
                      setSelectedBatchForPromotion(b);
                      setSelectedRequestForPromotion(null);
                      setIsPromotionWizardOpen(true);
                    }}
                    onManageCR={(b) => {
                      // Navigate to student tab filtered by batch
                      setStudentSearch(b.name);
                      setActiveTab("students");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Promotion Requests */}
        {activeTab === "promotions" && (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-[#1F2937]">
                  Class Representative Promotion Requests
                </h2>
                <p className="text-xs text-gray-500">
                  Review and process semester progression requests submitted by batch
                  representatives.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBFA] text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Batch</th>
                    <th className="px-6 py-3.5">Current Semester</th>
                    <th className="px-6 py-3.5">Submitted By (CR)</th>
                    <th className="px-6 py-3.5">Reason / Note</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {promotionRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No promotion requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    promotionRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {req.batch?.name} Batch ({req.batch?.program})
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-800">
                          {req.semester?.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{req.requestedBy?.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {req.requestedBy?.universityId}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate text-gray-600">
                          {req.reason || "Term completed"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              req.status === "PENDING"
                                ? "bg-amber-50 text-[#F59E0B] border border-amber-200/60"
                                : req.status === "APPROVED"
                                  ? "bg-emerald-50 text-[#16A34A] border border-emerald-200/60"
                                  : "bg-rose-50 text-[#E11D48] border border-rose-200/60"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {req.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => {
                                const targetBatch = batches.find((b) => b.id === req.batchId) || {
                                  id: req.batchId,
                                  name: req.batch?.name || "Batch",
                                  program: req.batch?.program || "HONOURS",
                                  status: "ACTIVE" as const,
                                };
                                setSelectedBatchForPromotion(targetBatch);
                                setSelectedRequestForPromotion(req);
                                setIsPromotionWizardOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#DC143C] hover:bg-[#B01030] text-white transition-colors"
                            >
                              Review & Promote
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Student Roster & Overrides */}
        {activeTab === "students" && (
          <div className="bg-white rounded-2xl shadow-xs border border-gray-100/80 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1F2937]">
                  Student Roster &amp; Semester Overrides
                </h2>
                <p className="text-xs text-gray-500">
                  Search students to manually update academic standing, reassign batches, or appoint
                  Class Representatives.
                </p>
              </div>

              {/* Search Box */}
              <div className="relative max-w-xs w-full">
                <input
                  type="text"
                  placeholder="Search by Name, Email, or University ID..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setStudentPage(1);
                  }}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
                />
                <svg
                  className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FFFBFA] text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Student Name</th>
                    <th className="px-6 py-3.5">University ID</th>
                    <th className="px-6 py-3.5">Batch</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Academic Status</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                        No students matching the query.
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900">{st.name}</div>
                          <div className="text-[11px] text-gray-500">{st.email}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-800">
                          {st.universityId || "—"}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-700">
                          {st.batch?.name ? `${st.batch.name} Batch` : "Unassigned"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              st.role === "CR"
                                ? "bg-orange-100 text-[#DA532C]"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {st.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              st.studentStatus === "ACTIVE"
                                ? "bg-emerald-50 text-[#16A34A]"
                                : st.studentStatus === "PROMOTED"
                                  ? "bg-blue-50 text-blue-700"
                                  : st.studentStatus === "DEMOTED"
                                    ? "bg-amber-50 text-amber-700"
                                    : st.studentStatus === "DROPOUT"
                                      ? "bg-rose-50 text-[#E11D48]"
                                      : "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {st.studentStatus || "ACTIVE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForOverride(st);
                              setIsOverrideModalOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                          >
                            Override Status...
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {studentTotal > 10 && (
              <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Showing {(studentPage - 1) * 10 + 1} to {Math.min(studentPage * 10, studentTotal)}{" "}
                  of {studentTotal} students
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={studentPage === 1}
                    onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={studentPage * 10 >= studentTotal}
                    onClick={() => setStudentPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-gray-200 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Batch Modal */}
      {isNewBatchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-extrabold text-gray-900 mb-4">Create New Academic Batch</h3>
            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label
                  htmlFor="batch-name-input"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Batch Name (e.g. "53rd") *
                </label>
                <input
                  id="batch-name-input"
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="e.g. 53rd"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
                />
              </div>

              <div>
                <label
                  htmlFor="batch-program-select"
                  className="block text-xs font-bold text-gray-700 mb-1"
                >
                  Academic Program *
                </label>
                <select
                  id="batch-program-select"
                  value={newBatchProgram}
                  onChange={(e) => setNewBatchProgram(e.target.value as Program)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] bg-white"
                >
                  <option value="HONOURS">B.Sc. (Honours) — 4 Years</option>
                  <option value="MASTERS">M.Sc. (Masters) — 1 Year</option>
                  <option value="PMSCS">PMSCS (Professional)</option>
                  <option value="PHD">Doctor of Philosophy (Ph.D.)</option>
                </select>
              </div>

              {/* Error message placed immediately above submit button */}
              {batchModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
                  ✕ {batchModalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewBatchModalOpen(false);
                    setBatchModalError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-[#DC143C] hover:bg-[#B01030] text-white cursor-pointer"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Semester Creation Modal */}
      <SemesterModal
        isOpen={isSemesterModalOpen}
        onClose={() => {
          setIsSemesterModalOpen(false);
          setSelectedBatchForSemester(null);
        }}
        onSubmit={handleCreateSemesterSubmit}
        batches={batches}
        selectedBatch={selectedBatchForSemester}
      />

      {/* Promotion Wizard Modal */}
      {selectedBatchForPromotion && (
        <PromotionWizard
          isOpen={isPromotionWizardOpen}
          onClose={() => {
            setIsPromotionWizardOpen(false);
            setSelectedBatchForPromotion(null);
            setSelectedRequestForPromotion(null);
          }}
          batch={selectedBatchForPromotion}
          pendingRequest={selectedRequestForPromotion}
          onPromote={handlePromoteBatchSubmit}
          onRejectRequest={handleRejectPromotion}
        />
      )}

      {/* Student Override Modal */}
      <StudentOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => {
          setIsOverrideModalOpen(false);
          setSelectedStudentForOverride(null);
        }}
        student={selectedStudentForOverride}
        batches={batches}
        onSubmit={handleOverrideStudentSubmit}
      />
    </div>
  );
};
