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

  it("renders role selector tabs for Student, CR, Teacher (Admin excluded)", () => {
    renderRegisterPage();

    expect(screen.getByRole("button", { name: "Student" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CR" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Teacher" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("switches to Teacher role and hides University ID without Teacher Unique ID", () => {
    renderRegisterPage();

    const teacherTab = screen.getByRole("button", { name: "Teacher" });
    fireEvent.click(teacherTab);

    expect(screen.queryByPlaceholderText("20220654955")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("e.g. T-JU-001")).not.toBeInTheDocument();
  });

  it("switches to Student role and renders University ID with placeholder 20220654955", () => {
    renderRegisterPage();

    expect(screen.getByPlaceholderText("20220654955")).toBeInTheDocument();
  });

  it("validates password match and shows error above submit button", async () => {
    renderRegisterPage();

    fireEvent.change(screen.getByPlaceholderText("e.g. Tahmid Hasan"), {
      target: { value: "Tahmid Hasan" },
    });
    fireEvent.change(screen.getByPlaceholderText("student@juniv.edu"), {
      target: { value: "student52_1@juniv.edu" },
    });
    fireEvent.change(screen.getByPlaceholderText("20220654955"), {
      target: { value: "20220654955" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "DifferentPass123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
  });

  it("submits student registration with preloaded credentials and confirm password", async () => {
    const registerMock = vi.fn().mockResolvedValue(undefined);

    renderRegisterPage({ register: registerMock });

    fireEvent.change(screen.getByPlaceholderText("e.g. Tahmid Hasan"), {
      target: { value: "Tahmid Hasan" },
    });
    fireEvent.change(screen.getByPlaceholderText("student@juniv.edu"), {
      target: { value: "student52_1@juniv.edu" },
    });
    fireEvent.change(screen.getByPlaceholderText("20220654955"), {
      target: { value: "20220654955" },
    });
    fireEvent.change(screen.getByPlaceholderText("At least 8 characters"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Re-enter your password"), {
      target: { value: "Password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(registerMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Tahmid Hasan",
          email: "student52_1@juniv.edu",
          universityId: "20220654955",
          role: "STUDENT",
          password: "Password123",
          confirmPassword: "Password123",
        })
      );
    });
  });
});
