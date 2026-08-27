import { useState, useEffect, useRef, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "../components/Alert.js";
import { getErrorMessage } from "../utils/errors.js";

export function VerifyEmailPage() {
  const { verifyEmail, resendVerification } = useAuth();
  const [searchParams] = useSearchParams();

  const [token, setToken] = useState(searchParams.get("token") || "");
  const [resendEmail, setResendEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasAutoVerified = useRef(false);

  useEffect(() => {
    const urlToken = searchParams.get("token");
    if (urlToken && !hasAutoVerified.current) {
      hasAutoVerified.current = true;
      const verifyFromUrl = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);
        try {
          const res = await verifyEmail(urlToken.trim());
          setSuccessMessage(res.message || "Your email has been verified successfully!");
        } catch (err: unknown) {
          setErrorMessage(
            getErrorMessage(
              err,
              "Verification failed. The token may be expired or invalid."
            )
          );
        } finally {
          setIsLoading(false);
        }
      };
      void verifyFromUrl();
    }
  }, [searchParams, verifyEmail]);

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorMessage("Please enter a valid verification token.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await verifyEmail(token.trim());
      setSuccessMessage(res.message || "Your email has been verified successfully!");
    } catch (err: unknown) {
      setErrorMessage(
        getErrorMessage(
          err,
          "Verification failed. The token may be expired or invalid."
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await resendVerification(resendEmail.trim());
      setSuccessMessage(res.message);
    } catch (err: unknown) {
      setErrorMessage(
        getErrorMessage(err, "Failed to resend verification email.")
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-blue-50/40">
      <div className="max-w-md w-full">
        <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-xs">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              Email Verification
            </h1>
            <p className="text-xs text-gray-500 mt-1.5">
              Confirm your email address to activate your account
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5">
              <Alert type="error" message={errorMessage} onClose={() => setErrorMessage(null)} />
            </div>
          )}

          {successMessage ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-medium">
                {successMessage}
              </div>
              <Link
                to="/login"
                className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg text-center"
              >
                Proceed to Sign In
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Manual Token Verification Form */}
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Verification Token or OTP
                  </label>
                  <input
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your 64-char token or OTP"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Validating Token...</span>
                    </>
                  ) : (
                    <span>Confirm Verification</span>
                  )}
                </button>
              </form>

              {/* Resend Section */}
              <div className="pt-5 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">
                  Expired token? Request a new one:
                </p>
                <form onSubmit={handleResend} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="Enter registered email"
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={isResending}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isResending ? "Sending..." : "Resend"}
                  </button>
                </form>
              </div>

              <div className="text-center text-xs text-gray-500">
                Back to{" "}
                <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                  Sign In
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
