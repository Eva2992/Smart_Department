import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ResetPasswordPage } from "../pages/ResetPasswordPage.js";
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

vi.mock("../context/useAuth.js", () => ({
  useAuth: () => mockAuth,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders password inputs and submit button", () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText("Enter token from email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter new password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm new password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeInTheDocument();
  });

  it("shows password strength meter", () => {
    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );

    // Type a weak password to trigger the strength meter
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "a" },
    });
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("calls resetPassword on form submission", async () => {
    vi.mocked(mockAuth.resetPassword).mockResolvedValue({ success: true, message: "Success" });

    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Enter token from email"), {
      target: { value: "some-token" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "StrongPass1!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "StrongPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(mockAuth.resetPassword).toHaveBeenCalledWith({
        token: "some-token",
        newPassword: "StrongPass1!",
        confirmPassword: "StrongPass1!",
      });
    });
  });

  it("shows error for invalid token", async () => {
    vi.mocked(mockAuth.resetPassword).mockRejectedValue({
      response: { data: { message: "Invalid or expired reset token" } },
    });

    render(
      <BrowserRouter>
        <ResetPasswordPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("Enter token from email"), {
      target: { value: "invalid-token" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter new password"), {
      target: { value: "StrongPass1!" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm new password"), {
      target: { value: "StrongPass1!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired reset token/i)).toBeInTheDocument();
    });
  });
});
