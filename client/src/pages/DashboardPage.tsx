import { useAuth } from "../context/useAuth.js";

export function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden mb-8">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <svg className="w-96 h-96" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-indigo-200 mb-4 border border-white/10">
            <span>JU CSE Academic Portal</span> • <span>Active Session</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Welcome, {user.name}!
          </h1>
          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed">
            Logged in as <span className="font-semibold text-white">{user.role}</span>
            {user.program ? ` • ${user.program}` : ""}
            {user.batchId ? ` • Batch ${user.batchId}` : ""}
            {user.isChairman ? " • Department Chairman" : ""}
          </p>
        </div>
      </div>

      {/* Profile & Metadata Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Account Details Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Identity & Credentials
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Email Address</span>
              <span className="font-semibold text-gray-900">{user.email}</span>
            </div>
            {user.universityId && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">University ID</span>
                <span className="font-semibold text-gray-900">{user.universityId}</span>
              </div>
            )}
            {user.teacherUniqueId && (
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Teacher ID</span>
                <span className="font-semibold text-gray-900">{user.teacherUniqueId}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Account Status</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Verified & Active
              </span>
            </div>
          </div>
        </div>

        {/* Academic Affiliation Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            Academic Information
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Department</span>
              <span className="font-semibold text-gray-900">Computer Science & Engineering</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Institution</span>
              <span className="font-semibold text-gray-900">Jahangirnagar University</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Assigned Role</span>
              <span className="font-bold text-indigo-600">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Security & Session Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-200/80">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            Security & Session
          </h2>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">JWT Access Token</span>
              <span className="font-semibold text-emerald-600">Active (15m expiry)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Hashed Refresh Token</span>
              <span className="font-semibold text-emerald-600">SHA-256 Secured (7d)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Auto-Rotation</span>
              <span className="font-semibold text-gray-900">Enabled on use</span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation Preview */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center">
        <h3 className="text-base font-bold text-gray-900 mb-1">
          Authentication & Identity Module Ready
        </h3>
        <p className="text-xs text-gray-500 max-w-xl mx-auto">
          User registration with preloaded roster verification, email confirmation tokens, and JWT
          access + hashed refresh token session management are fully operational.
        </p>
      </div>
    </div>
  );
}
