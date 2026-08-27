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

vi.mock('../context/useAuth.js', () => ({ 
  useAuth: () => mockAuth 
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
    vi.mocked(mockAuth.forgotPassword).mockResolvedValue({ success: true, message: "Reset link sent" });
    
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

  it("shows success alert after successful submission", async () => {
    vi.mocked(mockAuth.forgotPassword).mockResolvedValue({ success: true, message: "Check your email for the reset link" });
    
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
      expect(screen.getByText("Check your email for the reset link")).toBeInTheDocument();
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
