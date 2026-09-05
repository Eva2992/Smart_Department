import { useState } from "react";
import { CTPanel } from "../components/assessments/CTPanel.js";
import { AssignmentsPanel } from "../components/assessments/AssignmentsPanel.js";
import { CTMarksViewer } from "../components/assessments/CTMarksViewer.js";

export function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState<"ct" | "assignment" | "marks">("ct");

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-bg text-text">
      {/* Sidebar for Navigation between CT, Assignments, and Marks */}
      <aside className="w-full md:w-64 bg-surface border-b md:border-b-0 md:border-r border-gray-100 flex flex-col p-6 shadow-soft">
        <h1 className="font-heading text-xl font-bold text-primary mb-6">Assessments</h1>

        <nav className="flex md:flex-col gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("ct")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "ct"
                ? "bg-primary/10 text-primary font-bold"
                : "text-text-muted hover:bg-gray-50 hover:text-text"
            }`}
          >
            Class Tests (Schedule)
          </button>

          <button
            onClick={() => setActiveTab("marks")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "marks"
                ? "bg-primary/10 text-primary font-bold"
                : "text-text-muted hover:bg-gray-50 hover:text-text"
            }`}
          >
            CT Marks &amp; Aggregation
          </button>

          <button
            onClick={() => setActiveTab("assignment")}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              activeTab === "assignment"
                ? "bg-primary/10 text-primary font-bold"
                : "text-text-muted hover:bg-gray-50 hover:text-text"
            }`}
          >
            Assignments &amp; Submissions
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === "ct" ? (
            <CTPanel />
          ) : activeTab === "marks" ? (
            <CTMarksViewer />
          ) : (
            <AssignmentsPanel />
          )}
        </div>
      </main>
    </div>
  );
}
