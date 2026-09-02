import React, { useState, useEffect } from "react";
import { academicApi } from "../../api/academic";
import { useAuth } from "../../context/useAuth";

interface ManageCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId?: string;
  onSuccess?: () => void;
}

export function ManageCoursesModal({
  isOpen,
  onClose,
  batchId: propBatchId,
  onSuccess,
}: ManageCoursesModalProps) {
  const { user } = useAuth();
  const effectiveBatchId = propBatchId || user?.batchId;

  const [semesters, setSemesters] = useState<any[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
  const [courses, setCourses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // New course form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [creditHours, setCreditHours] = useState(3.0);
  const [teacherId, setTeacherId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchSemesterData = async () => {
    if (!effectiveBatchId) return;
    setLoading(true);
    try {
      const semList = await academicApi.getSemesters({ batchId: effectiveBatchId });
      setSemesters(semList);

      const activeSem = semList.find((s: any) => s.status === "ACTIVE") || semList[0];
      if (activeSem) {
        setSelectedSemesterId(activeSem.id);
        const detailedSem = await academicApi.getSemesterById(activeSem.id);
        setCourses(detailedSem?.courses || activeSem.courses || []);
      }

      const tList = await academicApi.getTeachers();
      setTeachers(tList);
      if (tList.length > 0 && !teacherId) {
        setTeacherId(tList[0].id);
      }
    } catch (err: unknown) {
      console.error("Failed to load semester courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSemesterData();
    }
  }, [isOpen, effectiveBatchId]);

  const handleSemesterChange = async (semId: string) => {
    setSelectedSemesterId(semId);
    setError(null);
    setFeedback(null);
    try {
      const detailedSem = await academicApi.getSemesterById(semId);
      setCourses(detailedSem?.courses || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSemesterId) {
      setError("Please select a semester first.");
      return;
    }
    if (!name.trim() || !code.trim() || !teacherId) {
      setError("Course title, code, and instructor are required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      await academicApi.addCourseToSemester(selectedSemesterId, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        creditHours: Number(creditHours),
        teacherId,
      });

      setFeedback(`Course "${code.trim()}" added successfully.`);
      setName("");
      setCode("");
      // Refresh course list
      const detailedSem = await academicApi.getSemesterById(selectedSemesterId);
      setCourses(detailedSem?.courses || []);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add course to semester";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!selectedSemesterId) return;
    try {
      await academicApi.deleteCourse(selectedSemesterId, courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setFeedback("Course removed from semester.");
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete course";
      setError(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-gray-100 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-bold text-[#DC143C] uppercase tracking-wider">
              Batch Academic Curriculum
            </span>
            <h3 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
              Manage Semester Courses
            </h3>
            <p className="text-xs text-[#6B7280]">
              Add or remove course curriculum entries for your batch's active term.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {feedback && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            ✓ {feedback}
          </div>
        )}

        {/* Content with Loading indicator */}
        {loading ? (
          <div className="p-8 text-center text-xs text-gray-500">
            <div className="w-6 h-6 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading curriculum data...
          </div>
        ) : (
          <>
            {/* Semester Selection */}
            {semesters.length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-[#1F2937] uppercase mb-1 font-[Inter]">
                  Selected Semester
                </label>
                <select
                  value={selectedSemesterId}
                  onChange={(e) => handleSemesterChange(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
                >
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs">
                No active semester found for this batch. Please request an administrator to initialize the semester.
              </div>
            )}

            {/* Current Course List */}
            <div>
              <h4 className="text-xs font-bold text-[#1F2937] uppercase tracking-wider mb-2 font-[Inter]">
                Enrolled Courses in Semester ({courses.length})
              </h4>
              {courses.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-2xl text-center text-xs text-gray-500">
                  No courses enrolled yet for this semester. Use the form below to add courses.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {courses.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900">{c.code}</span> —{" "}
                        <span className="text-gray-700">{c.name}</span>
                        <span className="ml-2 text-gray-400">({c.creditHours} Credits)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(c.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded hover:bg-rose-50 cursor-pointer transition"
                        title="Remove course"
                      >
                        ✕ Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Add Course Form */}
        <form onSubmit={handleAddCourse} className="p-4 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3">
          <h4 className="text-xs font-bold text-gray-900 uppercase font-[Inter]">
            + Add New Course to Semester
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Course Title *</label>
              <input
                type="text"
                placeholder="e.g. Operating Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Course Code *</label>
              <input
                type="text"
                placeholder="e.g. CSE-311"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Credit Hours</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="6"
                value={creditHours}
                onChange={(e) => setCreditHours(parseFloat(e.target.value) || 3.0)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Assigned Instructor *</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs text-[#1F2937] focus:outline-none focus:border-[#DC143C]"
              >
                <option value="" disabled>Select Instructor</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error message placed immediately above submit button */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[#E11D48] text-xs font-semibold">
              ✕ {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition disabled:opacity-50 cursor-pointer font-[Poppins]"
            >
              {isSubmitting ? "Adding Course..." : "Add Course"}
            </button>
          </div>
        </form>

        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
