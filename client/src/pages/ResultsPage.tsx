import { useState } from "react";
import { useAuth } from "../context/useAuth.js";
import { ResultQueryView } from "../components/ResultQueryView.js";
import { ResultUploadForm } from "../components/ResultUploadForm.js";

export function ResultsPage() {
  const { user } = useAuth();
  const canUpload = user && (user.role === "CR" || user.role === "ADMIN");
  const [activeTab, setActiveTab] = useState<"query" | "upload">("query");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden mb-8">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 mb-3 border border-white/10">
            <span>JU CSE Academic Records</span> • <span>Examination Results</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-['Poppins']">
            Semester Final Results Portal
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 font-['Inter'] mt-1 max-w-2xl">
            Official semester results published by Department Class Representatives and Administration.
            Search by student roll number, program, batch, or semester.
          </p>
        </div>
      </div>

      {/* Tabs navigation if user is CR or ADMIN */}
      {canUpload && (
        <div className="flex border-b border-gray-200 mb-8 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("query")}
            className={`pb-3 px-2 text-sm font-bold font-['Poppins'] transition-colors border-b-2 ${
              activeTab === "query"
                ? "border-[#DC143C] text-[#DC143C]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Public Results Search
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`pb-3 px-2 text-sm font-bold font-['Poppins'] transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "upload"
                ? "border-[#DC143C] text-[#DC143C]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            <span>Upload Grade Sheet</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DA532C] text-white">
              {user.role === "CR" ? "CR" : "Admin"}
            </span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === "upload" && canUpload ? (
        <ResultUploadForm onSuccess={() => setActiveTab("query")} />
      ) : (
        <ResultQueryView />
      )}
    </div>
  );
}
