import { useState, useId } from "react";
import { uploadResultsApi } from "../api/result.js";
import { useAuth } from "../context/useAuth.js";
import type { UploadResultRow } from "../types/result.js";
import { GradeSheetTable } from "./GradeSheetTable.js";

interface ResultUploadFormProps {
  onSuccess?: () => void;
}

export function ResultUploadForm({ onSuccess }: ResultUploadFormProps) {
  const { user } = useAuth();
  const batchIdInputId = useId();
  const semesterIdInputId = useId();
  const fileInputId = useId();
  const rawCsvInputId = useId();

  const [batchId, setBatchId] = useState(user?.batchId || "");
  const [semesterId, setSemesterId] = useState("");
  const [rawCsv, setRawCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<UploadResultRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default courses for parsing
  const defaultCourses = [
    { code: "CSE 401", title: "Distributed Systems", creditHours: 3.0 },
    { code: "CSE 402", title: "Compiler Design", creditHours: 3.0 },
    { code: "CSE 403", title: "Machine Learning", creditHours: 3.0 },
    { code: "CSE 404", title: "Software Engineering", creditHours: 3.0 },
    { code: "CSE 408", title: "Project & Seminar", creditHours: 1.5 },
  ];

  const mapMarksToGrade = (marks: number) => {
    if (marks >= 80) return { letterGrade: "A+", gradePoint: 4.0 };
    if (marks >= 75) return { letterGrade: "A", gradePoint: 3.75 };
    if (marks >= 70) return { letterGrade: "A-", gradePoint: 3.5 };
    if (marks >= 65) return { letterGrade: "B+", gradePoint: 3.25 };
    if (marks >= 60) return { letterGrade: "B", gradePoint: 3.0 };
    if (marks >= 55) return { letterGrade: "B-", gradePoint: 2.75 };
    if (marks >= 50) return { letterGrade: "C+", gradePoint: 2.5 };
    if (marks >= 45) return { letterGrade: "C", gradePoint: 2.25 };
    if (marks >= 40) return { letterGrade: "D", gradePoint: 2.0 };
    return { letterGrade: "F", gradePoint: 0.0 };
  };

  const handleParseCsv = (content: string) => {
    setError(null);
    setSuccessMsg(null);

    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setError("CSV must include a header and at least one student row.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idIdx = headers.findIndex((h) => h.includes("id") || h.includes("roll"));
    const nameIdx = headers.findIndex((h) => h.includes("name"));

    if (idIdx === -1) {
      setError("Header missing 'University ID' or 'Roll' column.");
      return;
    }

    const rows: UploadResultRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const universityId = cols[idIdx];
      const studentName = nameIdx !== -1 ? cols[nameIdx] : undefined;

      if (!universityId) continue;

      const courseMarks = defaultCourses.map((c) => {
        const cIdx = headers.findIndex((h) => h.includes(c.code.toLowerCase().replace(/\s+/g, "")));

        let marks: number | undefined;
        let letterGrade = "A";
        let gradePoint = 3.75;

        if (cIdx !== -1 && cols[cIdx]) {
          const val = parseFloat(cols[cIdx]);
          if (!isNaN(val)) {
            marks = val;
            const mapped = mapMarksToGrade(marks);
            letterGrade = mapped.letterGrade;
            gradePoint = mapped.gradePoint;
          }
        }

        return {
          courseCode: c.code,
          courseTitle: c.title,
          creditHours: c.creditHours,
          marks,
          letterGrade,
          gradePoint,
        };
      });

      const totalCredits = courseMarks.reduce((acc, c) => acc + c.creditHours, 0);
      const totalPoints = courseMarks.reduce((acc, c) => acc + c.gradePoint * c.creditHours, 0);
      const gpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;

      rows.push({
        universityId,
        studentName,
        courseMarks,
        gpa,
        cgpa: gpa,
      });
    }

    if (rows.length === 0) {
      setError("No valid student rows could be parsed.");
      return;
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawCsv(text);
      handleParseCsv(text);
    };
    reader.readAsText(file);
  };

  const handleDownloadSample = () => {
    const sample = `University ID,Student Name,CSE401,CSE402,CSE403,CSE404,CSE408\n2020101,Rahim Ahmed,85,78,92,80,88\n2020102,Karim Ullah,72,68,75,70,82\n2020103,Fatima Begum,88,84,90,86,95`;
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_semester_result.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId || !semesterId) {
      setError("Please specify both Batch ID and Semester ID.");
      return;
    }

    if (parsedRows.length === 0) {
      setError("Please upload and validate a grade sheet first.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await uploadResultsApi({
        batchId,
        semesterId,
        results: parsedRows,
        rawContent: rawCsv,
        fileName: fileName || "semester_result_sheet.csv",
        fileSizeBytes: rawCsv.length,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Results uploaded and published successfully!");
        setParsedRows([]);
        setRawCsv("");
        setFileName("");
        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } } };
      setError(errorObj.response?.data?.message || "Failed to upload and publish results.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xs border border-gray-200/80 mb-8">
      {/* Header with CR Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#DA532C] text-white text-xs font-bold rounded-full uppercase tracking-wider">
              {user?.role === "CR" ? "CR Upload Portal" : "Admin Result Publisher"}
            </span>
            <span className="text-xs text-gray-500 font-medium font-['Inter']">
              Dual-Hybrid Relational & Archive Storage
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 font-['Poppins'] mt-2">
            Upload Semester Final Results
          </h2>
          <p className="text-xs text-gray-500 font-['Inter'] mt-1">
            Upload semester grade sheets as CSV. Tabular records will parse automatically into
            student dashboards and the raw document will be archived in the Resource center.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 text-xs font-semibold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download CSV Template
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <svg className="w-4 h-4 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <svg
            className="w-4 h-4 text-emerald-600 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Batch & Semester Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor={batchIdInputId}
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Batch Identifier / ID <span className="text-[#DC143C]">*</span>
            </label>
            <input
              id={batchIdInputId}
              type="text"
              required
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g. batch-52 or 52nd"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
            />
          </div>

          <div>
            <label
              htmlFor={semesterIdInputId}
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              Semester Identifier / ID <span className="text-[#DC143C]">*</span>
            </label>
            <input
              id={semesterIdInputId}
              type="text"
              required
              value={semesterId}
              onChange={(e) => setSemesterId(e.target.value)}
              placeholder="e.g. sem-1 or 4th Year 1st Semester"
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
            />
          </div>
        </div>

        {/* File Dropzone & CSV Textarea */}
        <div className="space-y-3">
          <label htmlFor={fileInputId} className="block text-xs font-semibold text-gray-700">
            Upload Grade Sheet File (CSV)
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-gray-300 transition-colors bg-gray-50/50">
            <input
              id={fileInputId}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor={fileInputId} className="cursor-pointer flex flex-col items-center">
              <svg
                className="w-8 h-8 text-gray-400 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                {fileName ? `Selected: ${fileName}` : "Click to select CSV grade sheet"}
              </span>
              <span className="text-[11px] text-gray-400 mt-1">Supports UTF-8 formatted CSV</span>
            </label>
          </div>
        </div>

        {/* Or Paste Raw CSV */}
        <div>
          <label htmlFor={rawCsvInputId} className="block text-xs font-semibold text-gray-700 mb-1">
            Or Paste Raw CSV Data
          </label>
          <textarea
            id={rawCsvInputId}
            rows={3}
            value={rawCsv}
            onChange={(e) => {
              setRawCsv(e.target.value);
              handleParseCsv(e.target.value);
            }}
            placeholder="University ID,Student Name,CSE401,CSE402..."
            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]"
          />
        </div>

        {/* Live Validation & Preview */}
        {parsedRows.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900 font-['Poppins'] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Live Preview & Calculated GPAs ({parsedRows.length} Students)
              </h4>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                JU CSE Grading Scale Verified
              </span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {parsedRows.map((row, idx) => (
                <GradeSheetTable
                  key={`${row.universityId}-${idx}`}
                  universityId={row.universityId}
                  studentName={row.studentName}
                  courseMarks={row.courseMarks}
                  gpa={row.gpa}
                  cgpa={row.cgpa}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit CTA */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSubmitting || parsedRows.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#DC143C] hover:bg-[#b01030] text-white text-xs font-bold tracking-wide transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed font-['Poppins']"
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Publishing Results...
              </>
            ) : (
              `Publish Results (${parsedRows.length} Records)`
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
