import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CTMarksViewer } from "../components/assessments/CTMarksViewer.js";
import { ctApi } from "../api/assessments.js";
import { AuthContext } from "../context/authContextDef.js";
import type { AuthContextType } from "../types/auth.js";

vi.mock("../api/assessments.js", () => ({
  ctApi: {
    getStudentMarks: vi.fn(),
  },
}));

describe("CTMarksViewer Component (FR-27, ADR-0005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders continuous assessment marks, Best 3 of 4 summary, and class statistics", async () => {
    vi.mocked(ctApi.getStudentMarks).mockResolvedValue({
      success: true,
      message: "Marks retrieved",
      data: {
        student: {
          id: "student-1",
          name: "Alice Johnson",
          universityId: "20201001",
          batchId: "batch-1",
          batchName: "51st Batch",
          semesterId: "sem-1",
          semesterName: "8th Semester",
        },
        groups: [
          {
            courseId: "c-1",
            courseCode: "CSE 401",
            courseName: "Software Engineering",
            totalConducted: 4,
            totalRecorded: 4,
            bestOfThreeSum: 54,
            averageScore: 17.5,
            marks: [
              {
                scheduleEntryId: "ct-1",
                ctTitle: "Class Test 1",
                topic: "Design Patterns",
                date: "2026-02-15",
                startTime: "10:00",
                endTime: "11:00",
                roomNumber: "101",
                teacherName: "Dr. Karim",
                marksObtained: 18,
                maxMarks: 20,
                status: "RECORDED",
                classAverage: 16.2,
                highestMark: 20,
                lowestMark: 12,
              },
            ],
          },
        ],
      },
    });

    const mockAuthContext = {
      user: {
        id: "student-1",
        email: "alice@juniv.edu",
        role: "STUDENT" as const,
        name: "Alice Johnson",
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
        <CTMarksViewer />
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Class Test \(CT\) Marks/i)).toBeInTheDocument();
      expect(screen.getByText("Software Engineering")).toBeInTheDocument();
      expect(screen.getByText("Best 3 of 4 Total")).toBeInTheDocument();
      expect(screen.getByText("54")).toBeInTheDocument();
      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByText(/Avg: 16.2/i)).toBeInTheDocument();
    });
  });
});
