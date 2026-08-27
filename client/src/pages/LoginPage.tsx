import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { getErrorMessage, getErrorCode } from "../utils/errors.js";

export function LoginPage() {
  const { login, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnverified(false);
    setResendStatus(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const code = getErrorCode(err);
      const message = getErrorMessage(err, "Invalid email or password");

      setError(message);
      if (code === "EMAIL_NOT_VERIFIED" || message.toLowerCase().includes("verify your email")) {
        setIsUnverified(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      const res = await resendVerification(email);
      setResendStatus(res.message);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to resend verification email."));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-indigo-200 mb-3">
              JU
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-xs text-gray-500 mt-1.5">
              Sign in to your CSE Smart Schedular account
            </p>
          </div>

          {error && (
            <div className="mb-5">
              <Alert type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {resendStatus && (
            <div className="mb-5">
              <Alert type="success" message={resendStatus} onClose={() => setResendStatus(null)} />
            </div>
          )}

          {/* Unverified account helper */}
          {isUnverified && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <p className="font-semibold mb-1.5">Account Not Verified Yet</p>
              <p className="mb-3 text-amber-800">
                Please verify your email address to unlock account access. You can resend the activation token or enter it manually.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResend}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  Resend Activation Email
                </button>
                <Link
                  to="/verify-email"
                  className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-medium rounded-lg transition-colors"
                >
                  Enter Token
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@juniv.edu"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

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
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2.5 text-center text-xs text-gray-500">
            <div>
              Don't have an account?{" "}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                Register here
              </Link>
            </div>
            <div>
              Need to activate email?{" "}
              <Link to="/verify-email" className="text-indigo-600 hover:text-indigo-800 font-medium">
                Verify Email Screen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
