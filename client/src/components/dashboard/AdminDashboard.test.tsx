import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BrowserRouter } from "react-router-dom";
import { AdminDashboard } from "./AdminDashboard.js";
import * as dashboardApi from "../../api/dashboard.js";

vi.mock("../../api/dashboard.js", () => ({
  fetchAdminDashboard: vi.fn(),
}));

const mockAdminData: dashboardApi.AdminDashboardData = {
  systemOverview: {
    totalStudents: 480,
    totalTeachers: 31,
    activeBatches: 8,
    activeSemesters: 8,
    upcomingEvents: 42,
    unverifiedUsers: 4,
  },
  pendingPromotions: [
    {
      id: "pr-1",
      batch: { id: "b-1", name: "52nd Batch", program: "HONOURS" },
      semester: { id: "s-1", name: "4th Year 1st Semester" },
      requestedBy: { id: "u-1", name: "CR Person", role: "CR" },
      createdAt: new Date().toISOString(),
    },
  ],
  upcomingHolidays: [
    {
      id: "h-1",
      date: new Date(Date.now() + 86400000).toISOString(),
      reason: "University Foundation Day",
      scope: "ALL",
      batch: null,
    },
  ],
  todayRoomUsage: [
    {
      roomId: "r-1",
      room: { roomNumber: "R-101", type: "CLASSROOM" },
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      type: "CLASS",
      course: { code: "CSE 404", name: "Software Engineering" },
      batch: { name: "52nd" },
    },
  ],
  auditLogs: [
    {
      id: "log-1",
      action: "RESCHEDULE_CLASS",
      entityType: "ScheduleEntry",
      entityId: "e-1",
      details: {},
      createdAt: new Date().toISOString(),
      user: { id: "u-1", name: "Admin Officer", role: "ADMIN" },
    },
  ],
};

describe("AdminDashboard Component (FR-30)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders system overview stat counters", async () => {
    vi.mocked(dashboardApi.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("480")).toBeInTheDocument();
      expect(screen.getByText("31")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  it("renders pending actions panel with unverified registrations and promotion requests", async () => {
    vi.mocked(dashboardApi.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Pending Actions")).toBeInTheDocument();
      expect(screen.getByText("Unverified Account Registrations")).toBeInTheDocument();
      expect(screen.getByText("Semester Promotion: 52nd Batch")).toBeInTheDocument();
    });
  });

  it("renders upcoming holidays preview", async () => {
    vi.mocked(dashboardApi.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Upcoming Holidays")).toBeInTheDocument();
      expect(screen.getByText("University Foundation Day")).toBeInTheDocument();
      expect(screen.getByText("Department-wide")).toBeInTheDocument();
    });
  });

  it("renders today room allocation matrix preview", async () => {
    vi.mocked(dashboardApi.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Today's Room Allocation Preview")).toBeInTheDocument();
      expect(screen.getByText("R-101")).toBeInTheDocument();
      expect(screen.getByText(/Software Engineering/)).toBeInTheDocument();
    });
  });

  it("renders recent audit log feed", async () => {
    vi.mocked(dashboardApi.fetchAdminDashboard).mockResolvedValue(mockAdminData);

    render(
      <BrowserRouter>
        <AdminDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("System Activity Audit Log")).toBeInTheDocument();
      expect(screen.getByText("RESCHEDULE_CLASS")).toBeInTheDocument();
      expect(screen.getByText(/Admin Officer/)).toBeInTheDocument();
    });
  });
});
