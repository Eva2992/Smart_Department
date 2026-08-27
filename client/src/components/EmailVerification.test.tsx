import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { VerifyEmailPage } from "../pages/VerifyEmailPage.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

function renderVerifyEmailPage(authOverrides: Partial<AuthContextType> = {}) {
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
    ...authOverrides,
  };

  return {
    ...render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuth}>
          <VerifyEmailPage />
        </AuthContext.Provider>
      </BrowserRouter>
    ),
    mockAuth,
  };
}

describe("EmailVerification (React Testing Library Component Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders manual token input field and confirm button", () => {
    renderVerifyEmailPage();

    expect(screen.getByPlaceholderText("Paste your 64-char token or OTP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirm verification/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter registered email")).toBeInTheDocument();
  });

  it("submits manual token and verifies account successfully", async () => {
    const verifyMock = vi.fn().mockResolvedValue({
      success: true,
      message: "Email verified successfully! You can now log in.",
    });

    renderVerifyEmailPage({ verifyEmail: verifyMock });

    fireEvent.change(screen.getByPlaceholderText("Paste your 64-char token or OTP"), {
      target: { value: "valid-token-12345" },
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm verification/i }));

    await waitFor(() => {
      expect(verifyMock).toHaveBeenCalledWith("valid-token-12345");
      expect(screen.getByText(/Email verified successfully!/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /proceed to sign in/i })).toBeInTheDocument();
    });
  });

  it("dispatches resend verification email on expired token", async () => {
    const resendMock = vi.fn().mockResolvedValue({
      success: true,
      message: "Verification email sent successfully.",
    });

    renderVerifyEmailPage({ resendVerification: resendMock });

    fireEvent.change(screen.getByPlaceholderText("Enter registered email"), {
      target: { value: "student@juniv.edu" },
    });

    fireEvent.click(screen.getByRole("button", { name: /resend/i }));

    await waitFor(() => {
      expect(resendMock).toHaveBeenCalledWith("student@juniv.edu");
      expect(screen.getByText(/Verification email sent successfully/i)).toBeInTheDocument();
    });
  });
});
