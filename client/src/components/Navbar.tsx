import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { ChangePasswordModal } from "./ChangePasswordModal.js";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
            <div className="flex items-center gap-2 sm:gap-3">
              <Link to="/resources" className={navLinkClass("/resources")}>
                Resources
              </Link>
              <Link to="/results" className={navLinkClass("/results")}>
                Results
              </Link>

              {isAuthenticated && user ? (
                <>
                  <Link to="/dashboard" className={`${navLinkClass("/dashboard")} hidden sm:block`}>
                    Dashboard
                  </Link>
                  <Link to="/schedules" className={`${navLinkClass("/schedules")} hidden sm:block`}>
                    Routine &amp; Schedules
                  </Link>
                  {user.role === "ADMIN" && (
                    <Link
                      to="/admin/batches"
                      className={`${navLinkClass("/admin/batches")} hidden sm:block`}
                    >
                      Batch &amp; Semesters
                    </Link>
                  )}

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
          </div>
        </div>
      </header>

      {/* Global Change Password Modal triggered from Navbar Avatar */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
}

