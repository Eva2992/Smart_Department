import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { NotificationBell } from "./NotificationBell.js";
import { ChangePasswordModal } from "./ChangePasswordModal.js";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsDropdownOpen(false);
    setIsMobileOpen(false);
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

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navLinkClass = (path: string) =>
    `text-sm font-semibold transition-all px-3 py-1.5 rounded-xl ${
      isActive(path)
        ? "text-[#DC143C] bg-[#DC143C]/10 border-b-2 border-[#DC143C]"
        : "text-[#1F2937] hover:text-[#DC143C] hover:bg-gray-50"
    }`;

  const mobileNavLinkClass = (path: string) =>
    `block py-2 px-3 text-sm font-semibold rounded-xl transition-colors ${
      isActive(path) ? "bg-rose-50 text-[#DC143C]" : "text-[#1F2937] hover:bg-gray-50"
    }`;

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Department Brand */}
            <Link to="/" className="flex items-center gap-3 group shrink-0">
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

            {/* Desktop Navigation Items */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <Link to="/resources" className={navLinkClass("/resources")}>
                Resources
              </Link>
              <Link to="/results" className={navLinkClass("/results")}>
                Results
              </Link>

              {isAuthenticated && user ? (
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
                  {user.role === "ADMIN" && (
                    <Link to="/admin/batches" className={navLinkClass("/admin/batches")}>
                      Batch &amp; Semesters
                    </Link>
                  )}

                  <NotificationBell />

                  {/* Top-Right Circular Avatar Dropdown */}
                  <div className="relative ml-2" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#DC143C] to-[#B01030] text-white font-bold text-sm shadow-md hover:ring-2 hover:ring-[#DC143C]/40 hover:ring-offset-2 transition-all flex items-center justify-center cursor-pointer font-[Poppins]"
                      aria-label="User profile menu"
                      title={user.name}
                    >
                      {userInitials}
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-3 px-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="pb-3 mb-2 border-b border-gray-100">
                          <p className="text-sm font-bold text-[#1F2937] font-[Poppins] truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {user.role} {user.isChairman ? "(Chairman)" : ""}
                            </span>
                            {user.universityId && (
                              <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-full">
                                ID: {user.universityId}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDropdownOpen(false);
                              setIsChangePasswordOpen(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:text-[#DC143C] hover:bg-rose-50/60 rounded-xl transition flex items-center gap-2 cursor-pointer"
                          >
                            <span>🔑</span> Change Password
                          </button>

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-[#E11D48] hover:bg-rose-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
                          >
                            <span>🚪</span> Logout
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
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

            {/* Mobile Hamburger Toggle Button */}
            <div className="flex items-center gap-2 md:hidden">
              {isAuthenticated && user && (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#DC143C] to-[#B01030] text-white font-bold text-xs shadow-sm flex items-center justify-center font-[Poppins]"
                  aria-label="User profile menu"
                >
                  {userInitials}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Toggle navigation menu"
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
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

              {isAuthenticated && user ? (
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
                  {user.role === "ADMIN" && (
                    <Link
                      to="/admin/batches"
                      onClick={() => setIsMobileOpen(false)}
                      className={mobileNavLinkClass("/admin/batches")}
                    >
                      Batch &amp; Semesters
                    </Link>
                  )}
                  <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-900">{user.name}</p>
                      <p className="text-[10px] text-gray-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileOpen(false);
                          setIsChangePasswordOpen(true);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Change Password
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              ) : (
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
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
}
