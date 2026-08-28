import React, { useState } from "react";
import type { Batch, CourseInput } from "../../types/academic.js";

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

interface SemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    batchId: string;
    startDate: string;
    endDate: string;
    courses: CourseInput[];
  }) => Promise<void>;
  batches: Batch[];
  selectedBatch?: Batch | null;
  teachers?: TeacherOption[];
}

export const SemesterModal: React.FC<SemesterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  batches,
  selectedBatch,
  teachers = [],
}) => {
  const [name, setName] = useState("");
  // Default batch ID from selectedBatch or first batch
  const defaultBatchId = selectedBatch?.id || (batches[0]?.id ?? "");
  const [batchId, setBatchId] = useState(defaultBatchId);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [courses, setCourses] = useState<CourseInput[]>([
    { name: "", code: "", creditHours: 3.0, teacherId: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddCourse = () => {
    setCourses([...courses, { name: "", code: "", creditHours: 3.0, teacherId: "" }]);
  };

  const handleRemoveCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleCourseChange = (index: number, field: keyof CourseInput, value: string | number) => {
    const updated = [...courses];
    updated[index] = {
      ...updated[index],
      [field]: field === "creditHours" ? Number(value) : value,
    };
    setCourses(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Semester name is required (e.g., '3rd Year 1st Semester')");
      return;
    }

    if (!batchId) {
      setError("Please select a target batch");
      return;
    }

    if (!startDate || !endDate) {
      setError("Both start date and end date are required");
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      setError("Start date must be before end date");
      return;
    }

    // Validate course rows
    for (let i = 0; i < courses.length; i++) {
      const c = courses[i];
      if (!c.name.trim() || !c.code.trim()) {
        setError(`Course #${i + 1} requires both a name and course code`);
        return;
      }
      if (!c.teacherId) {
        setError(`Course #${i + 1} requires an assigned instructor`);
        return;
      }
      if (c.creditHours <= 0) {
        setError(`Course #${i + 1} credit hours must be greater than 0`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        batchId,
        startDate,
        endDate,
        courses,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
          ? err.message
          : "Failed to create semester";
      setError(msg || "Failed to create semester");
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
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-[#FFFBFA]">
          <div>
            <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wider">
              Academic Catalog (FR-06)
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#1F2937]">
              Create New Semester
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-[#E11D48] flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="semester-name" className="block text-xs font-bold text-gray-700 mb-1.5">
                Semester Name *
              </label>
              <input
                id="semester-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 3rd Year 1st Semester"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>

            <div>
              <label htmlFor="target-batch" className="block text-xs font-bold text-gray-700 mb-1.5">
                Target Batch *
              </label>
              <select
                id="target-batch"
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C] bg-white"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} Batch ({b.program})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-xs font-bold text-gray-700 mb-1.5">
                Start Date *
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>

            <div>
              <label htmlFor="end-date" className="block text-xs font-bold text-gray-700 mb-1.5">
                End Date *
              </label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
              />
            </div>
          </div>

          {/* Dynamic Course Mapping Section (AN-03) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                Curriculum Courses & Faculty Assignments ({courses.length})
              </span>
              <button
                type="button"
                onClick={handleAddCourse}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#DC143C] hover:text-[#B01030]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Course
              </button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {courses.map((course, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center"
                >
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Course Title (e.g. Software Eng)"
                      value={course.name}
                      onChange={(e) => handleCourseChange(idx, "name", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#DC143C]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Code (CSE 404)"
                      value={course.code}
                      onChange={(e) => handleCourseChange(idx, "code", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#DC143C]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Credits"
                      value={course.creditHours}
                      onChange={(e) => handleCourseChange(idx, "creditHours", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#DC143C]"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={course.teacherId}
                      onChange={(e) => handleCourseChange(idx, "teacherId", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#DC143C]"
                    >
                      <option value="">Select Faculty...</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    {courses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(idx)}
                        className="text-gray-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remove course"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
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
              {isSubmitting ? "Creating Semester..." : "Create Semester"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
