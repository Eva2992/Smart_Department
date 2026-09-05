import type { ChangeEvent } from "react";
import type { ResourceQuery, ResourceType } from "../../types/resource.js";

interface ResourceSearchFilterProps {
  query: ResourceQuery;
  onChange: (query: ResourceQuery) => void;
  availableYears?: number[];
  availableSemesters?: string[];
}

const RESOURCE_TYPES: { label: string; value: ResourceType }[] = [
  { label: "Lecture Slides", value: "SLIDES" },
  { label: "Class Notes", value: "NOTES" },
  { label: "Past Papers", value: "PAST_PAPER" },
  { label: "References / Other", value: "OTHER" },
];

export function ResourceSearchFilter({
  query,
  onChange,
  availableYears = [2026, 2025, 2024, 2023],
  availableSemesters = [
    "1st Year 1st Semester",
    "1st Year 2nd Semester",
    "2nd Year 1st Semester",
    "2nd Year 2nd Semester",
    "3rd Year 1st Semester",
    "3rd Year 2nd Semester",
    "4th Year 1st Semester",
    "4th Year 2nd Semester",
  ],
}: ResourceSearchFilterProps) {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, search: e.target.value || undefined, page: 1 });
  };

  const handleTypeToggle = (type: ResourceType) => {
    if (query.type === type) {
      const nextQuery = { ...query };
      delete nextQuery.type;
      onChange({ ...nextQuery, page: 1 });
    } else {
      onChange({ ...query, type, page: 1 });
    }
  };

  const handleYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
    onChange({ ...query, year: val, page: 1 });
  };

  const handleSemesterChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value || undefined;
    onChange({ ...query, semesterLabel: val, page: 1 });
  };

  const handleClearAll = () => {
    onChange({ page: 1, limit: query.limit || 20 });
  };

  const hasActiveFilters = Boolean(
    query.search || query.year || query.semesterLabel || query.type || query.courseName
  );

  return (
    <div className="bg-[#FFFFFF] rounded-[20px] p-5 sm:p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100/80 mb-6">
      {/* Search Row */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-[#6B7280]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={query.search || ""}
          onChange={handleSearchChange}
          placeholder="Search by title, course name, or topic..."
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#DC143C] focus:ring-2 focus:ring-[#DC143C]/20 transition-all outline-none font-[Inter]"
        />
        {query.search && (
          <button
            onClick={() => onChange({ ...query, search: undefined, page: 1 })}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
        {/* Type Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-[#6B7280] mr-1">Type:</span>
          {RESOURCE_TYPES.map((t) => {
            const isSelected = query.type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeToggle(t.value)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#DC143C] text-white border-[#DC143C] shadow-xs"
                    : "bg-gray-50 text-[#1F2937] border-gray-200 hover:bg-gray-100"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters (Year & Semester) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Year select */}
          <select
            value={query.year || ""}
            onChange={handleYearChange}
            aria-label="Filter by year"
            className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-[#1F2937] focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] outline-none cursor-pointer"
          >
            <option value="">All Years</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>

          {/* Semester select */}
          <select
            value={query.semesterLabel || ""}
            onChange={handleSemesterChange}
            aria-label="Filter by semester"
            className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-xl text-[#1F2937] focus:border-[#DC143C] focus:ring-1 focus:ring-[#DC143C] outline-none cursor-pointer"
          >
            <option value="">All Semesters</option>
            {availableSemesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={handleClearAll}
              type="button"
              className="text-xs font-bold text-[#DC143C] hover:text-[#B01030] hover:underline px-2 py-1 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
