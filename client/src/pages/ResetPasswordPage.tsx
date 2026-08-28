import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter.js";
import { getErrorMessage } from "../utils/errors.js";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get("token") || "";

  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [token, setToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await resetPassword({ token, newPassword, confirmPassword });
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to reset password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFFBFA]">
      <div className="max-w-md w-full">
        <div className="bg-[#FFFFFF] p-8 sm:p-10 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#DC143C] text-white font-black text-xl flex items-center justify-center mx-auto shadow-xs mb-3 font-[Poppins]">
              JU
            </div>
            <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight font-[Poppins]">
              Reset Password
            </h1>
            <p className="text-xs text-[#6B7280] mt-1.5">Enter your new password below</p>
          </div>

          {error && (
            <div className="mb-5">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {success && (
            <div className="mb-5">
              <Alert type="success" message={success} />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!urlToken && (
              <div>
                <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter token from email"
                  className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#1F2937]">New Password</label>
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
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
              <PasswordStrengthMeter password={newPassword} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !!success}
              className="w-full mt-4 py-3 px-4 bg-[#DC143C] hover:bg-[#B01030] text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-[Poppins]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2.5 text-center text-xs text-[#6B7280]">
            <div>
              Remember your password?{" "}
              <Link to="/login" className="text-[#DC143C] hover:text-[#B01030] font-semibold">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
