import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { StudentDashboard } from "./StudentDashboard.js";
import * as dashboardApi from "../../api/dashboard.js";

vi.mock("../../api/dashboard.js", () => ({
  fetchStudentDashboard: vi.fn(),
}));

const mockStudentData: dashboardApi.StudentDashboardData = {
  batch: { id: "b-1", name: "52nd Batch", program: "HONOURS" },
  semester: { id: "s-1", name: "4th Year 2nd Semester" },
  todaySchedule: [
    {
      id: "e-1",
      type: "CLASS",
      status: "SCHEDULED",
      date: new Date().toISOString(),
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      course: { id: "c-1", code: "CSE 404", name: "Software Engineering" },
      teacher: { id: "t-1", name: "Dr. Faculty" },
      room: { id: "r-1", roomNumber: "R-101" },
    },
  ],
  weekSchedule: [
    {
      id: "e-1",
      type: "CLASS",
      status: "SCHEDULED",
      date: new Date().toISOString(),
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      course: { id: "c-1", code: "CSE 404", name: "Software Engineering" },
      teacher: { id: "t-1", name: "Dr. Faculty" },
      room: { id: "r-1", roomNumber: "R-101" },
    },
  ],
  upcomingCTs: [
    {
      id: "ct-1",
      type: "CT",
      status: "SCHEDULED",
      date: new Date(Date.now() + 86400000).toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      topic: "Software Design Patterns",
      course: { id: "c-1", code: "CSE 404", name: "Software Engineering" },
      teacher: { id: "t-1", name: "Dr. Faculty" },
      room: { id: "r-1", roomNumber: "R-101" },
    },
  ],
  upcomingAssignments: [
    {
      id: "a-1",
      title: "Design Pattern Implementation",
      description: "Implement Factory & Singleton",
      dueDate: new Date(Date.now() + 172800000).toISOString(),
      status: "UPCOMING",
      course: { id: "c-1", code: "CSE 404", name: "Software Engineering" },
      teacher: { id: "t-1", name: "Dr. Faculty" },
    },
  ],
  ctMarksGrouped: [
    {
      courseId: "c-1",
      courseCode: "CSE 404",
      courseName: "Software Engineering",
      marks: [
        {
          id: "m-1",
          marksObtained: 19,
          maxMarks: 20,
          date: new Date().toISOString(),
          topic: "Design Patterns",
        },
      ],
    },
  ],
  classCount: [
    {
      courseCode: "CSE 404",
      courseName: "Software Engineering",
      teacherName: "Dr. Faculty",
      count: 14,
    },
  ],
  courses: [],
};

describe("StudentDashboard Component (FR-28)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading spinner initially and loads dashboard data", async () => {
    vi.mocked(dashboardApi.fetchStudentDashboard).mockResolvedValue(mockStudentData);

    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("52nd Batch")).toBeInTheDocument();
      expect(screen.getByText("4th Year 2nd Semester")).toBeInTheDocument();
    });

    // Check today's schedule
    expect(screen.getAllByText("Software Engineering").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/R-101/).length).toBeGreaterThan(0);

    // Check upcoming CTs widget
    expect(screen.getByText("Upcoming CTs")).toBeInTheDocument();
    expect(screen.getByText("Software Design Patterns")).toBeInTheDocument();

    // Check upcoming assignments
    expect(screen.getByText("Upcoming Assignments")).toBeInTheDocument();
    expect(screen.getByText("Design Pattern Implementation")).toBeInTheDocument();

    // Check CT Marks
    expect(screen.getByText("CT Marks")).toBeInTheDocument();

    // Check Class Count
    expect(screen.getByText(/Class Count/i)).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();

    // Check Quick Links
    expect(screen.getByText("Examination Results")).toBeInTheDocument();
    expect(screen.getByText("Study Resources")).toBeInTheDocument();
  });

  it("toggles between day and week views in schedule section", async () => {
    vi.mocked(dashboardApi.fetchStudentDashboard).mockResolvedValue(mockStudentData);

    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    });

    const weekButton = screen.getByRole("button", { name: "Week" });
    fireEvent.click(weekButton);

    expect(screen.getByText("This Week")).toBeInTheDocument();
  });

  it("expands CT marks accordion on click", async () => {
    vi.mocked(dashboardApi.fetchStudentDashboard).mockResolvedValue(mockStudentData);

    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("Software Engineering").length).toBeGreaterThan(0);
    });

    const courseAccordionBtn = screen.getByRole("button", { name: /1 CT\(s\)/i });
    fireEvent.click(courseAccordionBtn);

    await waitFor(() => {
      expect(screen.getByText("19/20")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
    });
  });

  it("handles error state gracefully", async () => {
    vi.mocked(dashboardApi.fetchStudentDashboard).mockRejectedValue({
      response: { data: { message: "Batch not found" } },
    } as unknown as Error);

    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Batch not found")).toBeInTheDocument();
    });
  });
});
