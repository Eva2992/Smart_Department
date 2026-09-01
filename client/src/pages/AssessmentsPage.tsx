import { useState } from "react";
import { CTPanel } from "../components/assessments/CTPanel.js";
import { AssignmentsPanel } from "../components/assessments/AssignmentsPanel.js";

export function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState<"ct" | "assignment">("ct");

  return (
    <div className="flex h-screen bg-bg text-text">
      {/* Sidebar for Navigation between CT and Assignments */}
      <aside className="w-64 bg-surface border-r border-gray-100 flex flex-col p-6 shadow-soft">
        <h1 className="font-heading text-2xl font-bold text-primary mb-8">Assessments</h1>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setActiveTab("ct")}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "ct"
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-gray-50 hover:text-text"
            }`}
          >
            Class Tests
          </button>

          <button
            onClick={() => setActiveTab("assignment")}
            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "assignment"
                ? "bg-primary/10 text-primary"
                : "text-text-muted hover:bg-gray-50 hover:text-text"
            }`}
          >
            Assignments
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === "ct" ? <CTPanel /> : <AssignmentsPanel />}
        </div>
      </main>
    </div>
  );
}
