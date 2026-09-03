import { useState } from "react";
import { useAuth } from "../context/useAuth.js";
import { Link } from "react-router-dom";
import { ChangePasswordModal } from "../components/ChangePasswordModal.js";
import { StudentDashboard } from "../components/dashboard/StudentDashboard.js";
import { TeacherDashboard } from "../components/dashboard/TeacherDashboard.js";
import { AdminDashboard } from "../components/dashboard/AdminDashboard.js";

export function DashboardPage() {
  const { user } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (!user) return null;

  const isStudentOrCr = user.role === "STUDENT" || user.role === "CR";
  const isTeacher = user.role === "TEACHER";
  const isAdmin = user.role === "ADMIN";
  const canUploadResults = user.role === "CR" || user.role === "ADMIN";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#1F2937] via-[#2d1217] to-[#DC143C] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <svg className="w-80 h-80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-rose-100 mb-3 border border-white/10">
            <span>JU CSE Department Digitalization</span> • <span>Academic Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2 font-[Poppins]">
            Welcome, {user.name}!
          </h1>
          <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed">
            Logged in as <span className="font-semibold text-white">{user.role}</span>
            {user.program ? ` • ${user.program}` : ""}
            {user.batchId ? ` • Batch ${user.batchId}` : ""}
            {user.isChairman ? " • Department Chairman" : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              to="/results"
              className="px-3.5 py-1.5 text-xs font-bold text-gray-900 bg-white hover:bg-gray-100 rounded-xl transition-all shadow-xs font-[Poppins]"
            >
              Examination Results →
            </Link>
            {canUploadResults && (
              <Link
                to="/results"
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#DA532C] hover:bg-[#b83e1c] rounded-xl transition-all shadow-xs font-[Poppins]"
              >
                {user.role === "CR" ? "Upload Batch Grade Sheet" : "Publish Results"}
              </Link>
            )}
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="px-3.5 py-1.5 text-xs font-semibold text-white/90 bg-white/15 hover:bg-white/25 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Account Security
            </button>
          </div>
        </div>
      </div>

      {/* Role-Specific Dashboard Content */}
      {isStudentOrCr && <StudentDashboard />}
      {isTeacher && <TeacherDashboard />}
      {isAdmin && <AdminDashboard />}

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
