import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { TeacherDashboard } from "./TeacherDashboard.js";
import * as dashboardApi from "../../api/dashboard.js";

vi.mock("../../api/dashboard.js", () => ({
  fetchTeacherDashboard: vi.fn(),
}));

const mockTeacherData: dashboardApi.TeacherDashboardData = {
  teacher: { id: "t-1", name: "Dr. Faculty Teacher", teacherUniqueId: "FAC-404" },
  todaySchedule: [],
  upcomingClasses: [
    {
      id: "e-1",
      type: "CLASS",
      status: "SCHEDULED",
      date: new Date().toISOString(),
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
      course: { id: "c-1", code: "CSE 404", name: "Software Engineering" },
      batch: { id: "b-1", name: "52nd Batch" },
      room: { id: "r-1", roomNumber: "R-101" },
    },
    {
      id: "e-2",
      type: "CLASS",
      status: "SCHEDULED",
      date: new Date(Date.now() + 86400000).toISOString(),
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      course: { id: "c-2", code: "CSE 302", name: "Database Systems" },
      batch: { id: "b-2", name: "53rd Batch" },
      room: { id: "r-2", roomNumber: "R-201" },
    },
  ],
  assignedBatches: [
    {
      id: "b-1",
      name: "52nd Batch",
      program: "HONOURS",
      courses: [
        {
          id: "c-1",
          code: "CSE 404",
          name: "Software Engineering",
          semesterName: "4th Year 2nd Semester",
        },
      ],
    },
    {
      id: "b-2",
      name: "53rd Batch",
      program: "HONOURS",
      courses: [
        {
          id: "c-2",
          code: "CSE 302",
          name: "Database Systems",
          semesterName: "3rd Year 2nd Semester",
        },
      ],
    },
  ],
  classCountByBatch: [
    { batchId: "b-1", batchName: "52nd Batch", count: 18 },
    { batchId: "b-2", batchName: "53rd Batch", count: 12 },
  ],
};

describe("TeacherDashboard Component (FR-29)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders teacher details and unique ID", async () => {
    vi.mocked(dashboardApi.fetchTeacherDashboard).mockResolvedValue(mockTeacherData);

    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Dr. Faculty Teacher")).toBeInTheDocument();
      expect(screen.getByText("FAC-404")).toBeInTheDocument();
    });
  });

  it("renders quick action buttons in Crimson Red styling", async () => {
    vi.mocked(dashboardApi.fetchTeacherDashboard).mockResolvedValue(mockTeacherData);

    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel class/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /reschedule class/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /schedule ct/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create assignment/i })).toBeInTheDocument();
    });
  });

  it("renders class count stats counters", async () => {
    vi.mocked(dashboardApi.fetchTeacherDashboard).mockResolvedValue(mockTeacherData);

    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("18")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });

  it("renders general board of upcoming classes", async () => {
    vi.mocked(dashboardApi.fetchTeacherDashboard).mockResolvedValue(mockTeacherData);

    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/General Board — Upcoming Classes/i)).toBeInTheDocument();
      expect(screen.getAllByText("Software Engineering").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Database Systems").length).toBeGreaterThan(0);
    });
  });

  it("switches batch-wise tabs and displays filtered schedule", async () => {
    vi.mocked(dashboardApi.fetchTeacherDashboard).mockResolvedValue(mockTeacherData);

    render(
      <BrowserRouter>
        <TeacherDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("52nd Batch (HONOURS)")).toBeInTheDocument();
    });

    const secondBatchTab = screen.getByText("53rd Batch (HONOURS)");
    fireEvent.click(secondBatchTab);

    expect(screen.getByText("Upcoming Classes for 53rd Batch")).toBeInTheDocument();
  });
});
