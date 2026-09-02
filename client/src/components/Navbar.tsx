import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-[#DC143C]/10 text-[#DC143C] border-[#DC143C]/20";
      case "TEACHER":
        return "bg-[#1F2937]/10 text-[#1F2937] border-[#1F2937]/20";
      case "CR":
        return "bg-[#DA532C]/10 text-[#DA532C] border-[#DA532C]/20";
      default:
        return "bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/20";
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Department Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/smart-department-icon.svg"
              alt="Smart Department"
              className="w-10 h-10 object-contain rounded-xl transition-transform group-hover:scale-105"
            />
            <div>
              <span className="text-base sm:text-lg font-bold text-[#1F2937] block leading-tight font-[Poppins]">
                Smart Department
              </span>
              <span className="text-[11px] text-[#6B7280] font-medium tracking-wide">
                CSE • Jahangirnagar University
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-4">
            <Link
              to="/resources"
              className="text-sm font-medium text-[#1F2937] hover:text-[#DC143C] transition-colors"
            >
              Resources
            </Link>
            <Link
              to="/results"
              className="text-sm font-medium text-[#1F2937] hover:text-[#DC143C] transition-colors"
            >
              Results
            </Link>
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-[#1F2937] hover:text-[#DC143C] transition-colors hidden sm:block"
                >
                  Dashboard
                </Link>
                <Link
                  to="/schedules"
                  className="text-sm font-medium text-[#1F2937] hover:text-[#DC143C] transition-colors hidden sm:block"
                >
                  Routine &amp; Schedules
                </Link>
                {user.role === "ADMIN" && (
                  <Link
                    to="/admin/batches"
                    className="text-sm font-medium text-[#1F2937] hover:text-[#DC143C] transition-colors hidden sm:block"
                  >
                    Batch &amp; Semesters
                  </Link>
                )}
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-[#1F2937] leading-tight font-[Poppins]">
                      {user.name}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 mt-0.5 rounded-full border ${getRoleBadge(
                        user.role
                      )}`}
                    >
                      {user.role} {user.isChairman ? "(Chairman)" : ""}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#E11D48] hover:bg-rose-50 rounded-lg border border-gray-200 hover:border-rose-200 transition-all cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-[#1F2937] hover:text-[#DC143C] hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
