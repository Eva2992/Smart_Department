import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { getErrorMessage } from "../utils/errors.js";

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; resetToken?: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await forgotPassword(email);
      setSuccess({ message: res.message, resetToken: res.resetToken });
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send reset link"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFFBFA]">
      <div className="max-w-md w-full">
        <div className="bg-[#FFFFFF] p-8 sm:p-10 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="text-center mb-8">
            <img
              src="/smart-department-icon.svg"
              alt="Smart Department"
              className="w-14 h-14 object-contain mx-auto mb-3"
            />
            <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight font-[Poppins]">
              Forgot Password
            </h1>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Enter your email to receive a password reset link
            </p>
          </div>

          {error && (
            <div className="mb-5">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {success && (
            <div className="mb-5">
              <Alert type="success" message={success.message} onClose={() => setSuccess(null)} />
              {success.resetToken && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs break-all">
                  <span className="font-semibold text-gray-700">Dev token:</span>{" "}
                  {success.resetToken}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@juniv.edu"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 px-4 bg-[#DC143C] hover:bg-[#B01030] text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-[Poppins]"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Reset Link</span>
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
