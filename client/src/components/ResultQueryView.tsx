import { useState, useEffect, useId } from "react";
import { queryResultsApi } from "../api/result.js";
import type { StudentResult } from "../types/result.js";
import { GradeSheetTable } from "./GradeSheetTable.js";
import { getGpaBadgeClass } from "../utils/gradeStyles.js";

export function ResultQueryView() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [program, setProgram] = useState<string>("");
  const [batchId, setBatchId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const searchInputId = useId();
  const programSelectId = useId();
  const batchInputId = useId();
  const semesterInputId = useId();

  useEffect(() => {
    let ignore = false;
    // Asynchronous fetch
    queryResultsApi({
      search: activeSearch || undefined,
      program: program || undefined,
      batchId: batchId || undefined,
      semesterId: semesterId || undefined,
      page,
      limit: 10,
    })
      .then((res) => {
        if (!ignore && res.success && res.data) {
          setResults(res.data.results);
          setTotalPages(res.data.pagination.totalPages);
          setTotalCount(res.data.pagination.total);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const errorObj = err as { response?: { data?: { message?: string } } };
          setError(errorObj.response?.data?.message || "Failed to load results.");
        }
      })
      .finally(() => {
        if (!ignore) {
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [activeSearch, batchId, page, program, semesterId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setPage(1);
    setActiveSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Card */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-['Poppins']">
              Semester Final Examination Results
            </h2>
            <p className="text-xs text-gray-500 font-['Inter'] mt-0.5">
              Department of Computer Science & Engineering, Jahangirnagar University
            </p>
          </div>
          <div className="text-xs font-semibold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
            Total Results Published: <span className="text-[#DC143C] font-bold">{totalCount}</span>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search input */}
            <div>
              <label
                htmlFor={searchInputId}
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Search Roll or Name
              </label>
              <input
                id={searchInputId}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="e.g. 2020101 or Rahim"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>

            {/* Program Filter */}
            <div>
              <label
                htmlFor={programSelectId}
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Academic Program
              </label>
              <select
                id={programSelectId}
                value={program}
                onChange={(e) => {
                  setIsLoading(true);
                  setProgram(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] bg-white"
              >
                <option value="">All Programs</option>
                <option value="HONOURS">B.Sc. (Honours)</option>
                <option value="MASTERS">M.Sc.</option>
                <option value="PMSCS">PMSCS</option>
                <option value="MPHIL">M.Phil</option>
                <option value="PHD">Ph.D</option>
              </select>
            </div>

            {/* Batch input */}
            <div>
              <label
                htmlFor={batchInputId}
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Batch
              </label>
              <input
                id={batchInputId}
                type="text"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                placeholder="Filter by batch..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>

            {/* Semester input */}
            <div>
              <label
                htmlFor={semesterInputId}
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Semester
              </label>
              <input
                id={semesterInputId}
                type="text"
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                placeholder="Filter by semester..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setActiveSearch("");
                setProgram("");
                setBatchId("");
                setSemesterId("");
                setPage(1);
                setIsLoading(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#DC143C] hover:bg-[#b01030] text-white text-xs font-bold rounded-xl transition-all shadow-sm font-['Poppins']"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search Results
            </button>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#DC143C] mb-3" />
          <p className="text-xs text-gray-500 font-medium">Fetching examination results...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200/80 shadow-xs">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-sm font-bold text-gray-900 font-['Poppins']">No Results Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search criteria or select a different academic program or batch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((res) => {
            const isExpanded = expandedId === res.id;
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl p-5 shadow-xs border border-gray-200/80 hover:border-gray-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 font-['Poppins']">
                        {res.student?.name || `Student ${res.universityId}`}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        Roll: {res.universityId}
                      </span>
                      {res.batch?.program && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                          {res.batch.program}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-['Inter']">
                      {res.batch?.name ? `Batch: ${res.batch.name} • ` : ""}
                      {res.semester?.name || "Semester Final Result"}
                      <span className="text-gray-400">
                        {" "}
                        • Published: {new Date(res.publishedAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div
                      className={`px-3.5 py-1.5 rounded-xl border flex flex-col items-center justify-center min-w-[80px] ${getGpaBadgeClass(
                        res.gpa
                      )}`}
                    >
                      <span className="text-[9px] uppercase font-semibold tracking-wider opacity-80">
                        GPA
                      </span>
                      <span className="text-lg font-black font-['Poppins']">
                        {res.gpa.toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : res.id)}
                      className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors inline-flex items-center gap-1"
                    >
                      {isExpanded ? "Hide Breakdown" : "View Breakdown"}
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <GradeSheetTable
                      studentName={res.student?.name}
                      universityId={res.universityId}
                      courseMarks={res.courseMarks}
                      gpa={res.gpa}
                      cgpa={res.cgpa}
                      semesterName={res.semester?.name}
                      batchName={res.batch?.name}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs">
              <span className="text-xs text-gray-500 font-medium">
                Page <span className="font-bold text-gray-900">{page}</span> of{" "}
                <span className="font-bold text-gray-900">{totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
