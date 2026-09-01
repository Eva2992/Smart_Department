import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeminarBookingForm } from "../components/SeminarBookingForm";
import * as scheduleApi from "../api/scheduleApi";
import { useAuth } from "../context/useAuth";

import type { AuthContextType } from "../types/auth";

vi.mock("../context/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getRooms: vi.fn().mockResolvedValue([
      { id: "r-202", roomNumber: "R-202", type: "MULTIPURPOSE" },
      { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
    ]),
    checkConflict: vi.fn(),
    createSeminar: vi.fn(),
  };
});

describe("SeminarBookingForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show locked access message for non-chairman teacher", () => {
    const mockAuth: AuthContextType = {
      user: {
        id: "teacher-1",
        name: "Dr. Regular",
        email: "regular@juniv.edu",
        role: "TEACHER",
        isChairman: false,
        isVerified: true,
      },
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    };

    vi.mocked(useAuth).mockReturnValue(mockAuth);

    render(<SeminarBookingForm />);

    expect(screen.getByText("Chairman Access Required")).toBeInTheDocument();
    expect(
      screen.getByText(/Only the Department Chairman can allocate seminars and workshops/i)
    ).toBeInTheDocument();
  });

  it("should render full booking form for Chairman user", async () => {
    const mockAuth: AuthContextType = {
      user: {
        id: "chairman-1",
        name: "Prof. Chairman",
        email: "chair@juniv.edu",
        role: "TEACHER",
        isChairman: true,
        isVerified: true,
      },
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    };

    vi.mocked(useAuth).mockReturnValue(mockAuth);

    render(<SeminarBookingForm />);

    expect(
      screen.getByRole("heading", { name: /Schedule Seminar \/ Workshop/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. AI in Healthcare Workshop/i)).toBeInTheDocument();
  });

  it("should render booking form for Admin user", async () => {
    const mockAuth: AuthContextType = {
      user: {
        id: "admin-1",
        name: "Admin User",
        email: "admin@juniv.edu",
        role: "ADMIN",
        isChairman: false,
        isVerified: true,
      },
      tokens: null,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerification: vi.fn(),
      changePassword: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    };

    vi.mocked(useAuth).mockReturnValue(mockAuth);

    render(<SeminarBookingForm />);

    expect(
      screen.getByRole("heading", { name: /Schedule Seminar \/ Workshop/i })
    ).toBeInTheDocument();
  });
});
