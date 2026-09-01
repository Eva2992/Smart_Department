import { useState, useRef } from "react";
import type { ChangeEvent, DragEvent, FormEvent } from "react";
import { uploadResourceApi } from "../../api/resource.js";
import type { ResourceType } from "../../types/resource.js";
import { formatFileSize } from "../../utils/resourceUtils.js";

interface ResourceUploadFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function ResourceUploadForm({ onSuccess, onCancel }: ResourceUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [courseName, setCourseName] = useState("");
  const [semesterLabel, setSemesterLabel] = useState("4th Year 2nd Semester");
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState<ResourceType>("SLIDES");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const semesterOptions = [
    "1st Year 1st Semester",
    "1st Year 2nd Semester",
    "2nd Year 1st Semester",
    "2nd Year 2nd Semester",
    "3rd Year 1st Semester",
    "3rd Year 2nd Semester",
    "4th Year 1st Semester",
    "4th Year 2nd Semester",
    "Masters 1st Semester",
    "Masters 2nd Semester",
  ];

  const handleFileValidation = (file: File): boolean => {
    setError(null);
    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 50 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return false;
    }

    const name = file.name.toLowerCase();
    const isExtValid = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!isExtValid) {
      setError("Invalid file format. Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG.");
      return false;
    }

    setSelectedFile(file);
    if (!title) {
      // Auto-populate title from filename without extension
      const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setTitle(baseName);
    }
    return true;
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileValidation(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedFile) {
      setError("Please select a document or resource file to upload.");
      return;
    }

    if (!title.trim() || !courseName.trim() || !semesterLabel.trim()) {
      setError("Please fill in all required metadata fields.");
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("title", title.trim());
      formData.append("courseName", courseName.trim());
      formData.append("semesterLabel", semesterLabel.trim());
      formData.append("year", year.toString());
      formData.append("type", type);

      await uploadResourceApi(formData, (progress) => {
        setUploadProgress(progress);
      });

      setSuccessMsg("Study resource uploaded successfully!");
      setSelectedFile(null);
      setTitle("");
      setCourseName("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (onSuccess) {
        setTimeout(onSuccess, 800);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload study resource.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-[20px] p-6 sm:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100/80 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DA532C]/10 text-[#DA532C] flex items-center justify-center font-bold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#1F2937] font-[Poppins]">
              Upload Study Resource
            </h2>
            <p className="text-xs text-[#6B7280]">
              Share slides, lecture notes, question banks, or reference materials
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs font-semibold text-[#6B7280] hover:text-[#1F2937] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-[#E11D48] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-[#16A34A] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[16px] p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? "border-[#DC143C] bg-[#DC143C]/5"
              : selectedFile
                ? "border-[#16A34A]/50 bg-emerald-50/30"
                : "border-gray-300 hover:border-[#DC143C] bg-gray-50/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.jpeg"
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#16A34A] flex items-center justify-center font-bold">
                ✓
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[#1F2937] font-[Poppins]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-[#6B7280]">
                  {formatFileSize(selectedFile.size)} • Click or drag to change file
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 text-[#6B7280] flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-[#1F2937]">
                Drag and drop your file here, or{" "}
                <span className="text-[#DC143C] underline">browse files</span>
              </p>
              <p className="text-xs text-[#6B7280]">
                Supported: PDF, DOCX, PPTX, XLSX, PNG, JPG (Max 50 MB)
              </p>
            </div>
          )}
        </div>

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-[#1F2937]">
              <span>Uploading resource...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#DC143C] h-2 rounded-full transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Metadata Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Title */}
          <div className="sm:col-span-2">
            <label
              htmlFor="resource-title-input"
              className="block text-xs font-semibold text-[#1F2937] mb-1"
            >
              Resource Title *
            </label>
            <input
              id="resource-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4: Object Oriented Design Patterns"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#DC143C] focus:ring-2 focus:ring-[#DC143C]/20 outline-none transition-all"
            />
          </div>

          {/* Course Name */}
          <div>
            <label
              htmlFor="resource-course-input"
              className="block text-xs font-semibold text-[#1F2937] mb-1"
            >
              Course Name / Code *
            </label>
            <input
              id="resource-course-input"
              type="text"
              required
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. CSE 404: Software Engineering"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#DC143C] focus:ring-2 focus:ring-[#DC143C]/20 outline-none transition-all"
            />
          </div>

          {/* Resource Type */}
          <div>
            <label
              htmlFor="resource-category-select"
              className="block text-xs font-semibold text-[#1F2937] mb-1"
            >
              Resource Category *
            </label>
            <select
              id="resource-category-select"
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#DC143C] focus:ring-2 focus:ring-[#DC143C]/20 outline-none transition-all cursor-pointer"
            >
              <option value="SLIDES">Lecture Slides</option>
              <option value="NOTES">Class Notes</option>
              <option value="PAST_PAPER">Past Question Paper</option>
              <option value="OTHER">Reference / Book / Other</option>
            </select>
          </div>

          {/* Semester Label */}
          <div>
            <label
              htmlFor="resource-semester-select"
              className="block text-xs font-semibold text-[#1F2937] mb-1"
            >
              Semester *
            </label>
            <select
              id="resource-semester-select"
              value={semesterLabel}
              onChange={(e) => setSemesterLabel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#DC143C] focus:ring-2 focus:ring-[#DC143C]/20 outline-none transition-all cursor-pointer"
            >
              {semesterOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label
              htmlFor="resource-year-input"
              className="block text-xs font-semibold text-[#1F2937] mb-1"
            >
              Year *
            </label>
            <input
              id="resource-year-input"
              type="number"
              required
              min={1990}
              max={2100}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || 2026)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-[#DC143C] focus:ring-2 focus:ring-[#DC143C]/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* Submit CTA */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-semibold text-[#6B7280] hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-bold text-white bg-[#DC143C] hover:bg-[#B01030] active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Uploading...</span>
              </>
            ) : (
              <span>Publish Resource</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
