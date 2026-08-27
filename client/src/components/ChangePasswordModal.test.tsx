import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChangePasswordModal } from "./ChangePasswordModal.js";
import type { AuthContextType } from "../types/auth.js";

const mockAuth: AuthContextType = {
  user: null,
  tokens: null,
  isLoading: false,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  verifyEmail: vi.fn(),
  resendVerification: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
};

vi.mock('../context/useAuth.js', () => ({ 
  useAuth: () => mockAuth 
}));

describe("ChangePasswordModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not render when isOpen is false", () => {
    render(
      <ChangePasswordModal isOpen={false} onClose={vi.fn()} />
    );
    expect(screen.queryByText("Change Password")).not.toBeInTheDocument();
  });

  it("renders form when isOpen is true", () => {
    render(
      <ChangePasswordModal isOpen={true} onClose={vi.fn()} />
    );
    expect(screen.getByPlaceholderText("Enter current password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
  });

  it("shows password strength meter for new password", () => {
    render(
      <ChangePasswordModal isOpen={true} onClose={vi.fn()} />
    );

    // Type a weak password to trigger the strength meter
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "a" },
    });
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("calls changePassword on form submission", async () => {
    vi.mocked(mockAuth.changePassword).mockResolvedValue({ success: true, message: "Success" });
    
    render(
      <ChangePasswordModal isOpen={true} onClose={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText("Enter current password"), {
      target: { value: "OldPass1!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "NewPass1!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "NewPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockAuth.changePassword).toHaveBeenCalledWith({
        currentPassword: "OldPass1!",
        newPassword: "NewPass1!",
        confirmPassword: "NewPass1!"
      });
    });
  });

  it("closes on cancel button click", () => {
    const handleClose = vi.fn();
    render(
      <ChangePasswordModal isOpen={true} onClose={handleClose} />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
