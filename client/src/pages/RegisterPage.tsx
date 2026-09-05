import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { getErrorMessage } from "../utils/errors.js";
import type { Role } from "../types/auth.js";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<Role>("STUDENT");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified validation heuristics: at least 8 characters
  const hasMinLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasMinLength) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name,
        email,
        password,
        confirmPassword,
        role,
        universityId: role === "STUDENT" || role === "CR" ? universityId : undefined,
      });

      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Registration failed. Please check your details."));
    } finally {
      setIsLoading(false);
    }
  };

  const roleTabStyles = {
    STUDENT: "bg-[#6B7280] text-white shadow-xs",
    CR: "bg-[#DA532C] text-white shadow-xs",
    TEACHER: "bg-[#1F2937] text-white shadow-xs",
    ADMIN: "bg-[#DC143C] text-white shadow-xs",
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFFBFA]">
      <div className="max-w-xl w-full">
        <div className="bg-[#FFFFFF] p-8 sm:p-10 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          {/* Header */}
          <div className="text-center mb-8">
            <img
              src="/smart-department-icon.svg"
              alt="Smart Department"
              className="w-14 h-14 object-contain mx-auto mb-3"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] font-[Poppins] tracking-tight">
              Create Account
            </h1>
            <p className="text-sm text-[#6B7280] mt-2">
              Join the JU CSE Smart Department Platform
            </p>
          </div>

          {/* Role Selection Tabs (Pill style with role colors, Admin removed) */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#1F2937] uppercase tracking-wider mb-2">
              Select Your Role
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100/90 rounded-2xl">
              {(
                [
                  { key: "STUDENT", label: "Student" },
                  { key: "CR", label: "CR" },
                  { key: "TEACHER", label: "Teacher" },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setRole(t.key);
                    setError(null);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    role === t.key ? roleTabStyles[t.key] : "text-[#6B7280] hover:text-[#1F2937]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preloaded info banner */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-xl flex items-start gap-3">
            <svg
              className="w-5 h-5 text-[#DC143C] shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-xs text-[#1F2937] leading-relaxed">
              {role === "STUDENT" || role === "CR" ? (
                <span>
                  <strong>Student Preloaded Roster:</strong> Your University ID (e.g.{" "}
                  <code>20220654955</code>) and institutional email must match the official department
                  roster entered by Admin. Batch and program will be linked automatically.
                </span>
              ) : (
                <span>
                  <strong>Faculty Verification:</strong> Your institutional email (
                  <code>@juniv.edu</code>) must match the official faculty directory entered by
                  Admin.
                </span>
              )}
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tahmid Hasan"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === "TEACHER" ? "faculty@juniv.edu" : "student@juniv.edu"}
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            {/* Role Specific Fields */}
            {(role === "STUDENT" || role === "CR") && (
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                  University ID
                </label>
                <input
                  type="text"
                  required
                  value={universityId}
                  onChange={(e) => setUniversityId(e.target.value)}
                  placeholder="20220654955"
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
                />
              </div>
            )}

            {/* Enter Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#1F2937]">Enter Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#DC143C] hover:text-[#B01030] font-medium cursor-pointer"
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
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />

              {/* Password checklist (8+ characters, match) */}
              <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
                <div
                  className={`flex items-center gap-1.5 ${hasMinLength ? "text-[#16A34A] font-medium" : "text-[#6B7280]"}`}
                >
                  <span>{hasMinLength ? "✓" : "○"}</span> At least 8 characters
                </div>
                <div
                  className={`flex items-center gap-1.5 ${passwordsMatch ? "text-[#16A34A] font-medium" : "text-[#6B7280]"}`}
                >
                  <span>{passwordsMatch ? "✓" : "○"}</span> Passwords match
                </div>
              </div>
            </div>

            {/* Error Message: Placed EXACTLY above the submit button */}
            {error && (
              <div className="pt-2">
                <Alert type="error" message={error} onClose={() => setError(null)} />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#DC143C] hover:bg-[#B01030] text-white font-semibold text-sm rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-[Poppins]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying & Creating Account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-[#6B7280]">
            Already have an account?{" "}
            <Link to="/login" className="text-[#DC143C] hover:text-[#B01030] font-semibold">
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
