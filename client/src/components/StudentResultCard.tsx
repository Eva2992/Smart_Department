import { useState, useEffect } from "react";
import { getMyResultsApi } from "../api/result.js";
import type { StudentResult } from "../types/result.js";
import { getGpaBadgeClass } from "../utils/gradeStyles.js";
import { GradeSheetTable } from "./GradeSheetTable.js";
import { Link } from "react-router-dom";

export function StudentResultCard() {
  const [results, setResults] = useState<StudentResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    getMyResultsApi()
      .then((res) => {
        if (res.success && res.data) {
          setResults(res.data);
        }
      })
      .catch(() => {
        // Silently catch in dashboard if user has no results yet
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-10 bg-gray-100 rounded w-1/2" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-['Poppins'] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DC143C]" />
            Academic Performance & Results
          </h2>
          <Link
            to="/results"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            All Results →
          </Link>
        </div>
        <p className="text-xs text-gray-500 font-['Inter']">
          No semester final results published for your profile yet.
        </p>
      </div>
    );
  }

  const latestResult = results[0];
  const allGpas = results.map((r) => r.gpa);
  const avgCgpa =
    allGpas.length > 0
      ? Number((allGpas.reduce((a, b) => a + b, 0) / allGpas.length).toFixed(2))
      : latestResult.gpa;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-['Poppins'] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#DC143C]" />
            Academic Performance
          </h2>
          <p className="text-xs text-gray-500 font-['Inter'] mt-0.5">
            Latest Term: {latestResult.semester?.name || "Current Semester"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
          >
            {showBreakdown ? "Hide Details" : "View Breakdown"}
          </button>
          <Link
            to="/results"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#DC143C] hover:bg-[#b01030] rounded-xl transition-colors font-['Poppins']"
          >
            Full Portal →
          </Link>
        </div>
      </div>

      {/* GPA Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div
          className={`p-4 rounded-xl border flex flex-col items-center justify-center ${getGpaBadgeClass(
            latestResult.gpa
          )}`}
        >
          <span className="text-[10px] uppercase font-semibold tracking-wider opacity-80">
            Latest Term GPA
          </span>
          <span className="text-2xl font-black font-['Poppins'] mt-1">
            {latestResult.gpa.toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">
            Cumulative CGPA
          </span>
          <span className="text-2xl font-black font-['Poppins'] text-gray-900 mt-1">
            {(latestResult.cgpa ?? avgCgpa).toFixed(2)}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
          <span className="text-[10px] uppercase font-semibold tracking-wider text-gray-500">
            Completed Semesters
          </span>
          <span className="text-2xl font-black font-['Poppins'] text-indigo-700 mt-1">
            {results.length}
          </span>
        </div>
      </div>

      {showBreakdown && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {results.map((res) => (
            <GradeSheetTable
              key={res.id}
              studentName={res.student?.name}
              universityId={res.universityId}
              courseMarks={res.courseMarks}
              gpa={res.gpa}
              cgpa={res.cgpa}
              semesterName={res.semester?.name}
              batchName={res.batch?.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
