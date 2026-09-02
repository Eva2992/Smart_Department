import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage.js";
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

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email input and submit button", () => {
    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    expect(screen.getByPlaceholderText("name@juniv.edu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("calls forgotPassword on form submission", async () => {
    vi.mocked(mockAuth.forgotPassword).mockResolvedValue({
      success: true,
      message: "Reset link sent",
    });

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("name@juniv.edu"), {
      target: { value: "test@juniv.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockAuth.forgotPassword).toHaveBeenCalledWith("test@juniv.edu");
    });
  });

  it("shows success alert after successful submission and does not show dev token", async () => {
    vi.mocked(mockAuth.forgotPassword).mockResolvedValue({
      success: true,
      message: "Password reset link has been sent to your email.",
      resetToken: "some-secret-token",
    });

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("name@juniv.edu"), {
      target: { value: "test@juniv.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Password reset link has been sent to your email.")
      ).toBeInTheDocument();
    });

    // Dev token should NOT be displayed
    expect(screen.queryByText(/Dev token/i)).not.toBeInTheDocument();
    expect(screen.queryByText("some-secret-token")).not.toBeInTheDocument();
  });

  it("shows error alert when email is not found", async () => {
    vi.mocked(mockAuth.forgotPassword).mockRejectedValue(new Error("Email not found"));

    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText("name@juniv.edu"), {
      target: { value: "nonexistent@juniv.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText("Email not found")).toBeInTheDocument();
    });
  });

  it("shows 'Back to Login' link", () => {
    render(
      <BrowserRouter>
        <ForgotPasswordPage />
      </BrowserRouter>
    );

    expect(screen.getByText("Back to Login")).toBeInTheDocument();
  });
});
