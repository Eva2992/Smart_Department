import { useState } from "react";
import type { Resource } from "../../types/resource.js";
import { useAuth } from "../../context/useAuth.js";
import { downloadResourceApi } from "../../api/resource.js";
import { formatFileSize, getTypeBadgeClasses, formatTypeLabel } from "../../utils/resourceUtils.js";

interface ResourceCardProps {
  resource: Resource;
  onDelete?: (id: string) => Promise<void>;
}

export function ResourceCard({ resource, onDelete }: ResourceCardProps) {
  const { user } = useAuth();
  const [downloadCount, setDownloadCount] = useState(resource.downloadCount);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const canDelete = Boolean(user) && (user?.role === "ADMIN" || user?.id === resource.uploaderId);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      await downloadResourceApi(resource.id);
      setDownloadCount((prev) => prev + 1);

      // Trigger browser download via fileUrl or API endpoint
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
      const downloadEndpoint = `${baseUrl}/resources/${resource.id}/download`;
      window.open(downloadEndpoint, "_blank");
    } catch {
      // Fallback direct open
      window.open(resource.fileUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(resource.id);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const formattedDate = new Date(resource.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-[#FFFFFF] rounded-[16px] p-5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] border border-gray-100/80 hover:shadow-[0_6px_16px_rgba(0,0,0,0.09)] transition-all flex flex-col justify-between group">
      {/* Header & Badges */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getTypeBadgeClasses(
              resource.type
            )}`}
          >
            {formatTypeLabel(resource.type)}
          </span>

          <div className="flex items-center gap-1.5 text-xs text-[#6B7280] font-medium bg-gray-50 px-2 py-0.5 rounded-full">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{downloadCount}</span>
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-base font-bold text-[#1F2937] leading-snug font-[Poppins] line-clamp-2 group-hover:text-[#DC143C] transition-colors"
          title={resource.title}
        >
          {resource.title}
        </h3>

        {/* Course & Semester */}
        <div className="mt-2 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-[#1F2937] font-semibold">
            <svg
              className="w-3.5 h-3.5 text-[#DC143C] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span className="truncate">{resource.courseName}</span>
          </div>

          <div className="flex items-center gap-2 text-[#6B7280]">
            <span>{resource.semesterLabel}</span>
            <span>•</span>
            <span>Year {resource.year}</span>
          </div>
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
          {/* Uploader tag */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DA532C]"></span>
            <span className="font-medium text-[#1F2937] truncate max-w-[120px]">
              {resource.uploader?.name || "Class Representative"}
            </span>
            <span className="bg-[#DA532C]/10 text-[#DA532C] text-[9px] font-bold px-1.5 py-0.2 rounded border border-[#DA532C]/20">
              CR
            </span>
          </div>

          <span title={`Uploaded on ${formattedDate}`}>
            {formatFileSize(resource.fileSizeBytes)}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] active:scale-[0.98] rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            <span>{isDownloading ? "Downloading..." : "Download"}</span>
          </button>

          {canDelete && (
            <>
              {showConfirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-2.5 py-2 text-xs font-bold text-white bg-[#E11D48] hover:bg-rose-700 rounded-xl transition-all cursor-pointer"
                  >
                    {isDeleting ? "..." : "Confirm"}
                  </button>
                  <button
                    onClick={() => setShowConfirmDelete(false)}
                    className="px-2 py-2 text-xs font-semibold text-[#6B7280] hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  aria-label="Delete resource"
                  className="p-2 text-[#6B7280] hover:text-[#E11D48] hover:bg-rose-50 rounded-xl border border-gray-200 hover:border-rose-200 transition-all cursor-pointer"
                  title="Delete resource"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
