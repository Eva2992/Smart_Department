import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { getErrorMessage } from "../utils/errors.js";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = getErrorMessage(err, "The email or password you entered is incorrect.");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FFFBFA]">
      <div className="max-w-md w-full">
        <div className="bg-[#FFFFFF] p-8 sm:p-10 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#DC143C] text-white font-black text-xl flex items-center justify-center mx-auto shadow-xs mb-3 font-[Poppins]">
              JU
            </div>
            <h1 className="text-2xl font-bold text-[#1F2937] tracking-tight font-[Poppins]">
              Welcome Back
            </h1>
            <p className="text-xs text-[#6B7280] mt-1.5">
              Sign in to your CSE Smart Schedular account
            </p>
          </div>

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

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#1F2937]">Password</label>
                <div className="flex items-center gap-3">
                  <Link
                    to="/forgot-password"
                    className="text-xs text-[#DC143C] hover:text-[#B01030] font-medium"
                  >
                    Forgot Password?
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#DC143C] hover:text-[#B01030] font-medium cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
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
              className="w-full mt-2 py-3 px-4 bg-[#DC143C] hover:bg-[#B01030] text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-[Poppins]"
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

          <div className="mt-6 pt-5 border-t border-gray-100 flex flex-col gap-2.5 text-center text-xs text-[#6B7280]">
            <div>
              Don't have an account?{" "}
              <Link to="/register" className="text-[#DC143C] hover:text-[#B01030] font-semibold">
                Register here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
