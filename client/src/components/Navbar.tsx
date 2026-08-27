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
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "TEACHER":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "CR":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Department Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              JU
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-gray-900 via-indigo-950 to-gray-900 bg-clip-text text-transparent block leading-tight">
                Smart Schedular
              </span>
              <span className="text-xs text-gray-500 font-medium tracking-wide">
                CSE • Jahangirnagar University
              </span>
            </div>
          </Link>

          {/* Navigation Items */}
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors hidden sm:block"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-semibold text-gray-900 leading-tight">
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
                    className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition-all cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all hover:shadow-md cursor-pointer"
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
