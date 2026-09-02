import React, { useState, useEffect, useCallback } from "react";
import { academicApi } from "../../api/academic.js";
import type { Batch, Program, PreloadedStudent, PreloadedTeacher } from "../../types/academic.js";

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

interface PreloadedManagementProps {
  batches: Batch[];
}

export const PreloadedManagement: React.FC<PreloadedManagementProps> = ({ batches }) => {
  const [activeSubTab, setActiveSubTab] = useState<"students" | "teachers">("students");
  const [students, setStudents] = useState<PreloadedStudent[]>([]);
  const [teachers, setTeachers] = useState<PreloadedTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  // Manual entry forms
  const [studentForm, setStudentForm] = useState({
    universityId: "",
    name: "",
    email: "",
    batchId: batches[0]?.id || "",
    program: "HONOURS" as Program,
  });

  const [teacherForm, setTeacherForm] = useState({
    uniqueId: "",
    name: "",
    email: "",
    designation: "Assistant Professor",
    isChairman: false,
  });

  const [csvText, setCsvText] = useState("");
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  const fetchRosters = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeSubTab === "students") {
        const data = await academicApi.getPreloadedStudents({
          batchId: selectedBatchId || undefined,
          search: search || undefined,
        });
        setStudents(data?.students || []);
      } else {
        const data = await academicApi.getPreloadedTeachers({
          search: search || undefined,
        });
        setTeachers(data?.teachers || []);
      }
    } catch (err: unknown) {
      setFeedback({ type: "error", message: getErrorMessage(err, "Failed to load roster") });
    } finally {
      setIsLoading(false);
    }
  }, [activeSubTab, selectedBatchId, search]);

  useEffect(() => {
    fetchRosters();
  }, [fetchRosters]);

  const handleManualAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !studentForm.universityId ||
      !studentForm.name ||
      !studentForm.email ||
      !studentForm.batchId
    ) {
      setFeedback({ type: "error", message: "All fields are required" });
      return;
    }
    try {
      await academicApi.importPreloadedStudents([studentForm]);
      setFeedback({ type: "success", message: "Student added to preloaded roster successfully" });
      setStudentForm({
        universityId: "",
        name: "",
        email: "",
        batchId: batches[0]?.id || "",
        program: "HONOURS",
      });
      fetchRosters();
    } catch (err: unknown) {
      setFeedback({ type: "error", message: getErrorMessage(err, "Failed to add student") });
    }
  };

  const handleManualAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.uniqueId || !teacherForm.name || !teacherForm.email) {
      setFeedback({ type: "error", message: "All fields are required" });
      return;
    }
    try {
      await academicApi.importPreloadedTeachers([teacherForm]);
      setFeedback({ type: "success", message: "Teacher added to preloaded roster successfully" });
      setTeacherForm({
        uniqueId: "",
        name: "",
        email: "",
        designation: "Assistant Professor",
        isChairman: false,
      });
      fetchRosters();
    } catch (err: unknown) {
      setFeedback({ type: "error", message: getErrorMessage(err, "Failed to add teacher") });
    }
  };

  const handleBulkCsvImport = async () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.trim().split("\n");

      if (activeSubTab === "students") {
        // Expected CSV format: universityId,name,email,batchId,program
        const studentRecords: Partial<PreloadedStudent>[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || (i === 0 && line.toLowerCase().includes("universityid"))) continue;
          const [universityId, name, email, batchId, program] = line
            .split(",")
            .map((s) => s.trim());
          if (universityId && name && email) {
            studentRecords.push({
              universityId,
              name,
              email,
              batchId: batchId || batches[0]?.id,
              program: (program?.toUpperCase() || "HONOURS") as Program,
            });
          }
        }
        await academicApi.importPreloadedStudents(studentRecords);
        setFeedback({
          type: "success",
          message: `Imported ${studentRecords.length} records successfully`,
        });
      } else {
        // Expected CSV format: uniqueId,name,email,designation,isChairman
        const teacherRecords: Partial<PreloadedTeacher>[] = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line || (i === 0 && line.toLowerCase().includes("uniqueid"))) continue;
          const [uniqueId, name, email, designation, isChairman] = line
            .split(",")
            .map((s) => s.trim());
          if (uniqueId && name && email) {
            teacherRecords.push({
              uniqueId,
              name,
              email,
              designation: designation || "Lecturer",
              isChairman: isChairman?.toLowerCase() === "true",
            });
          }
        }
        await academicApi.importPreloadedTeachers(teacherRecords);
        setFeedback({
          type: "success",
          message: `Imported ${teacherRecords.length} records successfully`,
        });
      }

      setIsCsvModalOpen(false);
      setCsvText("");
      fetchRosters();
    } catch (err: unknown) {
      setFeedback({ type: "error", message: getErrorMessage(err, "CSV Import Failed") });
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("students")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "students"
                ? "bg-[#DC143C] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Preloaded Students (AN-01)
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("teachers")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === "teachers"
                ? "bg-[#DC143C] text-white shadow-xs"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Preloaded Teachers (AN-02)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsCsvModalOpen(true)}
          className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 hover:border-[#DC143C] text-gray-700 hover:text-[#DC143C] transition-colors cursor-pointer"
        >
          Bulk CSV Import
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Manual Entry Form */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <h4 className="text-sm font-bold text-gray-900 mb-3">
          {activeSubTab === "students" ? "Add Preloaded Student" : "Add Preloaded Teacher"}
        </h4>

        {activeSubTab === "students" ? (
          <form onSubmit={handleManualAddStudent} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="University ID (e.g. 20201001)"
              value={studentForm.universityId}
              onChange={(e) => setStudentForm({ ...studentForm, universityId: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={studentForm.name}
              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <input
              type="email"
              placeholder="Official Email"
              value={studentForm.email}
              onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <select
              value={studentForm.batchId}
              onChange={(e) => setStudentForm({ ...studentForm, batchId: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] bg-white"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.program})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl transition-colors cursor-pointer"
            >
              Add Student
            </button>
          </form>
        ) : (
          <form onSubmit={handleManualAddTeacher} className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Teacher ID (e.g. T-101)"
              value={teacherForm.uniqueId}
              onChange={(e) => setTeacherForm({ ...teacherForm, uniqueId: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={teacherForm.name}
              onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <input
              type="email"
              placeholder="Teacher Email"
              value={teacherForm.email}
              onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <input
              type="text"
              placeholder="Designation"
              value={teacherForm.designation}
              onChange={(e) => setTeacherForm({ ...teacherForm, designation: e.target.value })}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C]"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl transition-colors cursor-pointer"
            >
              Add Teacher
            </button>
          </form>
        )}
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <input
            type="text"
            placeholder="Search by ID, name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] max-w-sm w-full"
          />

          {activeSubTab === "students" && (
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] bg-white"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.program})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-100">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">
                  {activeSubTab === "students" ? "Batch & Program" : "Designation"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    Loading roster...
                  </td>
                </tr>
              ) : activeSubTab === "students" ? (
                students.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      No preloaded students found.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => (
                    <tr key={st.id || st.universityId} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                        {st.universityId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{st.name}</td>
                      <td className="py-3 px-4 text-gray-600">{st.email}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {st.batch?.name || "Batch"} • {st.program}
                      </td>
                    </tr>
                  ))
                )
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    No preloaded teachers found.
                  </td>
                </tr>
              ) : (
                teachers.map((tc) => (
                  <tr key={tc.id || tc.uniqueId} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-mono font-semibold text-gray-900">
                      {tc.uniqueId}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{tc.name}</td>
                    <td className="py-3 px-4 text-gray-600">{tc.email}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {tc.designation} {tc.isChairman ? "• (Chairman)" : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Modal */}
      {isCsvModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 border border-gray-100">
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">
              Bulk CSV Import: {activeSubTab === "students" ? "Students" : "Teachers"}
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              {activeSubTab === "students"
                ? "Format: universityId, name, email, batchId, program"
                : "Format: uniqueId, name, email, designation, isChairman"}
            </p>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={
                activeSubTab === "students"
                  ? "20201001, John Doe, john@juniv.edu, batch-id-1, HONOURS\n20201002, Jane Smith, jane@juniv.edu, batch-id-1, HONOURS"
                  : "T-01, Dr. Karim, karim@juniv.edu, Professor, false\nT-02, Dr. Rahim, rahim@juniv.edu, Associate Professor, true"
              }
              className="w-full p-3 font-mono text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#DC143C] mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCsvImport}
                className="px-4 py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl transition-colors cursor-pointer"
              >
                Upload &amp; Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
