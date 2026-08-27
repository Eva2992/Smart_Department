import { useState, type FormEvent } from "react";
import { useAuth } from "../context/useAuth.js";
import { Alert } from "./Alert.js";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter.js";
import { getErrorMessage } from "../utils/errors.js";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await changePassword({ currentPassword, newPassword, confirmPassword });
      setSuccess("Password updated successfully! Logging out in 2s...");
      setTimeout(() => {
        onClose();
        // The logout happens automatically in the auth context
      }, 2000);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to change password"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-[#1F2937] font-[Poppins]">Change Password</h2>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            disabled={!!success}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
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
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-[#1F2937]">Current Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-xs text-[#DC143C] hover:text-[#B01030] font-medium cursor-pointer"
                >
                  {showPassword ? "Hide All" : "Show All"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">New Password</label>
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
              <label className="block text-xs font-semibold text-[#1F2937] mb-1">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm text-[#1F2937] focus:ring-2 focus:ring-[#DC143C] focus:border-[#DC143C] transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading || !!success}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !!success}
                className="flex-1 py-2.5 px-4 bg-[#DC143C] hover:bg-[#B01030] text-white font-semibold text-sm rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
