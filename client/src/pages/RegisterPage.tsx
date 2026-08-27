import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { getErrorMessage } from "../utils/errors.js";
import type { Role, Program } from "../types/auth.js";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [universityId, setUniversityId] = useState("");
  const [teacherUniqueId, setTeacherUniqueId] = useState("");
  const [program, setProgram] = useState<Program>("HONOURS");
  const [batchId, setBatchId] = useState("52nd");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredToken, setRegisteredToken] = useState<string | null>(null);

  // Validation heuristics
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSpecial;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("Please ensure your password meets all complexity requirements.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        name,
        email,
        password,
        role,
        universityId: role === "STUDENT" || role === "CR" ? universityId : undefined,
        teacherUniqueId: role === "TEACHER" ? teacherUniqueId : undefined,
        program: role === "STUDENT" || role === "CR" ? program : undefined,
        batchId: role === "STUDENT" || role === "CR" ? batchId : undefined,
      });

      if (result.verificationToken) {
        setRegisteredToken(result.verificationToken);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Registration failed. Please check your credentials."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40">
      <div className="max-w-xl w-full">
        {/* Success Modal / Card after registration */}
        {registeredToken ? (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-50 text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
            <p className="text-gray-600 text-sm mb-6">
              A verification link has been generated. Please verify your email to activate your account.
            </p>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left mb-6 font-mono text-xs break-all">
              <span className="text-gray-500 block mb-1 font-sans font-semibold">Verification Token (for testing / manual entry):</span>
              <span className="text-indigo-700 select-all font-bold">{registeredToken}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(`/verify-email?token=${encodeURIComponent(registeredToken)}`)}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all cursor-pointer"
              >
                Verify Email Now
              </button>
              <Link
                to="/login"
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium text-sm rounded-xl transition-all"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Create Account
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                Join the JU CSE Academic Management System
              </p>
            </div>

            {error && (
              <div className="mb-6">
                <Alert type="error" message={error} onClose={() => setError(null)} />
              </div>
            )}

            {/* Role Selection Tabs */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1 bg-gray-100/80 rounded-xl">
                {(
                  [
                    { key: "STUDENT", label: "Student" },
                    { key: "CR", label: "CR" },
                    { key: "TEACHER", label: "Teacher" },
                    { key: "ADMIN", label: "Admin" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setRole(t.key);
                      setError(null);
                    }}
                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      role === t.key
                        ? "bg-white text-indigo-600 shadow-xs"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preloaded info banner */}
            <div className="mb-6 p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="text-xs text-indigo-900 leading-relaxed">
                {role === "STUDENT" || role === "CR" ? (
                  <span>
                    <strong>Student Preloaded Roster:</strong> Your University ID (e.g.{" "}
                    <code>2021-1-60-001</code>) and batch must match the official department roster entered by Admin.
                  </span>
                ) : role === "TEACHER" ? (
                  <span>
                    <strong>Teacher Verification:</strong> Your Teacher ID (e.g. <code>T-JU-001</code>) and institutional
                    email (<code>@juniv.edu</code>) must match the faculty roster.
                  </span>
                ) : (
                  <span>
                    <strong>Admin Portal:</strong> System administrators oversee academic routine allocations and batch
                    transitions.
                  </span>
                )}
              </div>
            </div>

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tahmid Hasan"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === "TEACHER" ? "faculty@juniv.edu" : "student@juniv.edu"}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Role Specific Fields */}
              {(role === "STUDENT" || role === "CR") && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      University ID / Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      value={universityId}
                      onChange={(e) => setUniversityId(e.target.value)}
                      placeholder="e.g. 2021-1-60-001"
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Program
                      </label>
                      <select
                        value={program}
                        onChange={(e) => setProgram(e.target.value as Program)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="HONOURS">B.Sc. (Honours)</option>
                        <option value="MASTERS">M.Sc. (Masters)</option>
                        <option value="PMSCS">PMSCS</option>
                        <option value="MPHIL">M.Phil</option>
                        <option value="PHD">Ph.D.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Batch
                      </label>
                      <select
                        value={batchId}
                        onChange={(e) => setBatchId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="51st">Batch 51</option>
                        <option value="52nd">Batch 52</option>
                        <option value="53rd">Batch 53</option>
                        <option value="54th">Batch 54</option>
                        <option value="55th">Batch 55</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {role === "TEACHER" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Teacher Unique ID
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherUniqueId}
                    onChange={(e) => setTeacherUniqueId(e.target.value)}
                    placeholder="e.g. T-JU-001"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}

              {/* Password with live strength indicators */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />

                {/* Password strength checklist */}
                <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <span>{hasMinLength ? "✓" : "○"}</span> 8+ Characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUpper ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <span>{hasUpper ? "✓" : "○"}</span> Uppercase Letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLower ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <span>{hasLower ? "✓" : "○"}</span> Lowercase Letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumber && hasSpecial ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                    <span>{hasNumber && hasSpecial ? "✓" : "○"}</span> Number & Symbol
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-6 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying & Registering...</span>
                  </>
                ) : (
                  <span>Create Account</span>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-gray-500">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                Sign in here
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
