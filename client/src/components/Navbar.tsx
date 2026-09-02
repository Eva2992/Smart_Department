import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setIsMobileOpen(false);
    navigate("/login");
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-[#DC143C]/10 text-[#DC143C] border-[#DC143C]/30";
      case "TEACHER":
        return "bg-[#1F2937]/10 text-[#1F2937] border-[#1F2937]/30";
      case "CR":
        return "bg-[#DA532C]/10 text-[#DA532C] border-[#DA532C]/30";
      default:
        return "bg-[#6B7280]/10 text-[#6B7280] border-[#6B7280]/30";
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `text-xs lg:text-sm font-semibold transition-colors ${
      isActive(path) ? "text-[#DC143C]" : "text-[#1F2937] hover:text-[#DC143C]"
    }`;

  const mobileNavLinkClass = (path: string) =>
    `block py-2 px-3 text-sm font-semibold rounded-xl transition-colors ${
      isActive(path) ? "bg-rose-50 text-[#DC143C]" : "text-[#1F2937] hover:bg-gray-50"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Department Brand */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#DC143C] flex items-center justify-center text-white font-extrabold shadow-sm group-hover:bg-[#B01030] transition-colors">
              JU
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-[#1F2937] block leading-tight font-[Poppins]">
                Smart Schedular
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#6B7280] font-medium tracking-wide">
                CSE • Jahangirnagar University
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5">
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={navLinkClass("/dashboard")}>
                  Dashboard
                </Link>
                <Link to="/schedules" className={navLinkClass("/schedules")}>
                  Routine &amp; Schedules
                </Link>
                <Link to="/assessments" className={navLinkClass("/assessments")}>
                  Assessments
                </Link>
              </>
            )}
            <Link to="/resources" className={navLinkClass("/resources")}>
              Resources
            </Link>
            <Link to="/results" className={navLinkClass("/results")}>
              Results
            </Link>
            {isAuthenticated && user?.role === "ADMIN" && (
              <Link to="/admin/batches" className={navLinkClass("/admin/batches")}>
                Academic Admin
              </Link>
            )}
          </nav>

          {/* Desktop User Section */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
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
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#E11D48] hover:bg-rose-50 rounded-xl border border-gray-200 hover:border-rose-200 transition-all cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-xs font-semibold text-[#1F2937] hover:text-[#DC143C] hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && user && (
              <span
                className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsMobileOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              aria-expanded={isMobileOpen}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                {isMobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/98 backdrop-blur-lg px-4 pt-3 pb-5 shadow-lg animate-in slide-in-from-top-2 duration-200">
          <nav className="space-y-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/dashboard")}
                >
                  Dashboard
                </Link>
                <Link
                  to="/schedules"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/schedules")}
                >
                  Routine &amp; Schedules
                </Link>
                <Link
                  to="/assessments"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/assessments")}
                >
                  Assessments (CT &amp; Assignments)
                </Link>
                <Link
                  to="/resources"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/resources")}
                >
                  Academic Resources
                </Link>
                <Link
                  to="/results"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/results")}
                >
                  Semester Results
                </Link>
                {user?.role === "ADMIN" && (
                  <Link
                    to="/admin/batches"
                    onClick={() => setIsMobileOpen(false)}
                    className={mobileNavLinkClass("/admin/batches")}
                  >
                    Academic Admin
                  </Link>
                )}
                <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{user?.name}</p>
                    <p className="text-[10px] text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/resources"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/resources")}
                >
                  Academic Resources
                </Link>
                <Link
                  to="/results"
                  onClick={() => setIsMobileOpen(false)}
                  className={mobileNavLinkClass("/results")}
                >
                  Semester Results
                </Link>
                <div className="pt-3 mt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="text-center py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMobileOpen(false)}
                    className="text-center py-2 text-xs font-bold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-xl shadow-xs"
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
