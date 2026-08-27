import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { RegisterPage } from "../pages/RegisterPage.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

function renderRegisterPage(authOverrides: Partial<AuthContextType> = {}) {
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
    ...authOverrides,
  };

  return {
    ...render(
      <BrowserRouter>
        <AuthContext.Provider value={mockAuth}>
          <RegisterPage />
        </AuthContext.Provider>
      </BrowserRouter>
    ),
    mockAuth,
  };
}

describe("RegisterForm (React Testing Library Component Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders role selector tabs (Student, CR, Teacher, Admin)", () => {
    renderRegisterPage();

    expect(screen.getByRole("button", { name: "Student" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teacher" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Admin" })).toBeInTheDocument();
  });

  it("switches to Teacher role and renders Teacher Unique ID input", () => {
    renderRegisterPage();

    const teacherTab = screen.getByRole("button", { name: "Teacher" });
    fireEvent.click(teacherTab);

    expect(screen.getByPlaceholderText("e.g. T-JU-001")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("e.g. 2021-1-60-001")).not.toBeInTheDocument();
  });

  it("switches to Student role and renders University ID and batch dropdowns", () => {
    renderRegisterPage();

    expect(screen.getByPlaceholderText("e.g. 2021-1-60-001")).toBeInTheDocument();
    expect(screen.getByText("Batch 52")).toBeInTheDocument();
  });

  it("submits student registration with preloaded credentials", async () => {
    const registerMock = vi.fn().mockResolvedValue({
      verificationToken: "sample-token-12345",
      message: "Registration successful",
    });

    renderRegisterPage({ register: registerMock });

    fireEvent.change(screen.getByPlaceholderText("e.g. Tahmid Hasan"), {
      target: { value: "Tahmid Hasan" },
    });
    fireEvent.change(screen.getByPlaceholderText("student@juniv.edu"), {
      target: { value: "student52_1@juniv.edu" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g. 2021-1-60-001"), {
      target: { value: "2021-1-60-001" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "StrongPass123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Tahmid Hasan",
          email: "student52_1@juniv.edu",
          universityId: "2021-1-60-001",
          role: "STUDENT",
          password: "StrongPass123!",
        })
      );
      expect(screen.getByText(/Registration Successful!/i)).toBeInTheDocument();
      expect(screen.getByText("sample-token-12345")).toBeInTheDocument();
    });
  });
});
