import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

function renderLoginPage(authOverrides: Partial<AuthContextType> = {}) {
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
          <LoginPage />
        </AuthContext.Provider>
      </BrowserRouter>
    ),
    mockAuth,
  };
}

describe("LoginForm (React Testing Library Component Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email and password inputs and submit button", () => {
    renderLoginPage();

    expect(screen.getByPlaceholderText("name@juniv.edu")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("toggles password visibility when show/hide button is clicked", () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText("Enter your password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleButton = screen.getByRole("button", { name: /show/i });
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: /hide/i })).toBeInTheDocument();
  });

  it("submits form and calls login with entered credentials", async () => {
    const { mockAuth } = renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText("name@juniv.edu"), {
      target: { value: "student@juniv.edu" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAuth.login).toHaveBeenCalledWith({
        email: "student@juniv.edu",
        password: "Password123!",
      });
    });
  });

  it("displays user-friendly error message above submit button on login failure", async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error("The email or password you entered is incorrect."));

    renderLoginPage({ login: loginMock });

    fireEvent.change(screen.getByPlaceholderText("name@juniv.edu"), {
      target: { value: "wrong@juniv.edu" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
      target: { value: "WrongPass123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/The email or password you entered is incorrect/i)).toBeInTheDocument();
    });
  });
});
