import React from "react";
import type { Batch } from "../../types/academic.js";

interface BatchCardProps {
  batch: Batch;
  onCreateSemester: (batch: Batch) => void;
  onPromote: (batch: Batch) => void;
  onManageCR: (batch: Batch) => void;
}

export const BatchCard: React.FC<BatchCardProps> = ({
  batch,
  onCreateSemester,
  onPromote,
  onManageCR,
}) => {
  const isActive = batch.status === "ACTIVE";

  return (
    <div
      data-testid={`batch-card-${batch.id}`}
      className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100/80 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
    >
      {/* Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {batch.program}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isActive
                  ? "bg-emerald-50 text-[#16A34A] border border-emerald-200/60"
                  : "bg-gray-100 text-[#6B7280]"
              }`}
            >
              {isActive ? "Active Cohort" : "Completed"}
            </span>
          </div>
          <span className="text-xs font-medium text-gray-500">
            {batch.totalStudents ?? batch.students?.length ?? 0} Students
          </span>
        </div>

        <h3 className="text-xl font-extrabold text-[#1F2937] tracking-tight mb-2">
          {batch.name} Batch
        </h3>

        {/* Current Semester Status */}
        <div className="bg-[#FFFBFA] border border-rose-100/70 rounded-xl p-3.5 mb-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Current Active Semester</div>
          {batch.currentSemester ? (
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900">{batch.currentSemester.name}</span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                Active
              </span>
            </div>
          ) : (
            <div className="text-xs font-medium text-amber-700 flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-amber-500 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              No active semester configured
            </div>
          )}
        </div>

        {/* CR Information */}
        <div className="flex items-center justify-between text-xs py-2 border-t border-gray-100 mb-4">
          <span className="text-gray-500">Class Representative:</span>
          {batch.cr ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#DA532C] bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DA532C]" />
              {batch.cr.name} ({batch.cr.universityId || "CR"})
            </span>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onCreateSemester(batch)}
          className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Semester
        </button>

        {isActive && (
          <button
            type="button"
            onClick={() => onPromote(batch)}
            className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-[#DC143C] hover:bg-[#B01030] text-white shadow-xs transition-colors"
          >
            <svg
              className="w-3.5 h-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            Promote Batch
          </button>
        )}

        <button
          type="button"
          onClick={() => onManageCR(batch)}
          title="Assign or reappoint CR"
          className="p-2 text-xs font-semibold rounded-xl bg-orange-50 hover:bg-orange-100 text-[#DA532C] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
