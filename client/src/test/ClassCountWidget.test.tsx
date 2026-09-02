import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ClassCountWidget } from "../components/ClassCountWidget.js";
import { getClassCounts } from "../api/scheduleApi.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

vi.mock("../api/scheduleApi.js", () => ({
  getClassCounts: vi.fn(),
}));

describe("ClassCountWidget Component (SN-05, TN-10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders student view: classes conducted per course per teacher (SN-05)", async () => {
    vi.mocked(getClassCounts).mockResolvedValue({
      role: "STUDENT",
      totalConducted: 5,
      courses: [
        {
          courseId: "c-1",
          courseCode: "CSE 401",
          courseName: "Software Engineering",
          totalClasses: 5,
          teachers: [{ teacherId: "t-1", teacherName: "Dr. Karim", classCount: 5 }],
        },
      ],
    });

    const mockAuthContext = {
      user: {
        id: "student-1",
        email: "alice@juniv.edu",
        role: "STUDENT" as const,
        name: "Alice",
        isVerified: true,
      },
      token: "tok",
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockAuthContext as unknown as AuthContextType}>
        <ClassCountWidget />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Classes Conducted by Course & Teacher/i)).toBeInTheDocument();
      expect(screen.getByText("CSE 401")).toBeInTheDocument();
      expect(screen.getByText(/5 classes/i)).toBeInTheDocument();
    });
  });

  it("renders teacher view: classes taken per batch (TN-10)", async () => {
    vi.mocked(getClassCounts).mockResolvedValue({
      role: "TEACHER",
      totalClassesTaken: 12,
      batches: [
        {
          batchId: "b-1",
          batchName: "51st Batch",
          courseCode: "CSE 401",
          classCount: 12,
        },
      ],
    });

    const mockTeacherAuthContext = {
      user: {
        id: "teacher-1",
        email: "karim@juniv.edu",
        role: "TEACHER" as const,
        name: "Dr. Karim",
        isVerified: true,
      },
      token: "tok",
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    };

    render(
      <AuthContext.Provider value={mockTeacherAuthContext as unknown as AuthContextType}>
        <ClassCountWidget />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Classes Taken by Batch/i)).toBeInTheDocument();
      expect(screen.getByText("51st Batch")).toBeInTheDocument();
      expect(screen.getAllByText("12")).toHaveLength(2);
    });
  });
});
