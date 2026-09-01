import { useState, useEffect } from "react";
import { useAuth } from "../context/useAuth.js";
import { ResourceBrowser } from "../components/resources/ResourceBrowser.js";
import { ResourceUploadForm } from "../components/resources/ResourceUploadForm.js";
import { fetchHierarchyApi } from "../api/resource.js";
import type { ResourceHierarchyItem, ResourceQuery } from "../types/resource.js";

export function ResourcesPage() {
  const { user, isAuthenticated } = useAuth();
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [hierarchy, setHierarchy] = useState<ResourceHierarchyItem[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canUpload = isAuthenticated && (user?.role === "CR" || user?.role === "ADMIN");

  useEffect(() => {
    fetchHierarchyApi()
      .then((data) => setHierarchy(data))
      .catch(() => {
        // Non-blocking hierarchy loading failure
      });
  }, [refreshTrigger]);

  const handleUploadSuccess = () => {
    setShowUploadForm(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSemesterSelect = (year: number, semesterLabel: string) => {
    if (selectedYear === year && selectedSemester === semesterLabel) {
      setSelectedYear(null);
      setSelectedSemester(null);
    } else {
      setSelectedYear(year);
      setSelectedSemester(semesterLabel);
    }
  };

  const currentQuery: ResourceQuery = {
    ...(selectedYear ? { year: selectedYear } : {}),
    ...(selectedSemester ? { semesterLabel: selectedSemester } : {}),
  };

  return (
    <div className="min-h-screen bg-[#FFFBFA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-8 border-b border-gray-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wider">
                Public Repository
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-xs text-[#6B7280]">CSE Jahangirnagar University</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2937] font-[Poppins]">
              Academic Study Resources
            </h1>
            <p className="text-sm text-[#6B7280] mt-1 max-w-2xl font-[Inter]">
              Download lecture slides, lab manuals, question banks, and notes organized by year and
              semester.
            </p>
          </div>

          {canUpload && (
            <div className="shrink-0">
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer ${
                  showUploadForm
                    ? "bg-gray-100 text-[#1F2937] hover:bg-gray-200"
                    : "bg-[#DC143C] text-white hover:bg-[#B01030] active:scale-[0.98]"
                }`}
              >
                {showUploadForm ? (
                  <>
                    <span>✕ Close Form</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    <span>Upload Resource</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Upload Form Section */}
        {canUpload && showUploadForm && (
          <ResourceUploadForm
            onSuccess={handleUploadSuccess}
            onCancel={() => setShowUploadForm(false)}
          />
        )}

        {/* Content Layout with Category Hierarchy */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar Hierarchy (Desktop) */}
          {hierarchy.length > 0 && (
            <aside className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-[20px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100/80 sticky top-24">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1F2937] font-[Poppins]">
                    Academic Semesters
                  </h3>
                  {(selectedYear || selectedSemester) && (
                    <button
                      onClick={() => {
                        setSelectedYear(null);
                        setSelectedSemester(null);
                      }}
                      className="text-[11px] font-bold text-[#DC143C] hover:underline cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <div className="space-y-4 text-xs font-[Inter]">
                  {hierarchy.map((item) => (
                    <div key={item.year} className="space-y-1.5">
                      <div className="font-bold text-[#1F2937] flex items-center justify-between text-xs px-1">
                        <span>Year {item.year}</span>
                      </div>
                      <div className="space-y-1 pl-2 border-l-2 border-gray-100">
                        {item.semesters.map((sem) => {
                          const isSelected =
                            selectedYear === item.year && selectedSemester === sem.semesterLabel;
                          const totalFiles = sem.courses.reduce((acc, c) => acc + c.count, 0);
                          return (
                            <button
                              key={sem.semesterLabel}
                              onClick={() => handleSemesterSelect(item.year, sem.semesterLabel)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-[#DC143C]/10 text-[#DC143C] font-bold"
                                  : "text-[#6B7280] hover:bg-gray-50 hover:text-[#1F2937]"
                              }`}
                            >
                              <span className="truncate">{sem.semesterLabel}</span>
                              <span className="text-[10px] bg-gray-100 px-1.5 py-0.2 rounded-full font-medium text-[#6B7280]">
                                {totalFiles}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          )}

          {/* Main Browser Area */}
          <div className={hierarchy.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}>
            <ResourceBrowser
              key={`${selectedYear}-${selectedSemester}-${refreshTrigger}`}
              initialQuery={currentQuery}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
