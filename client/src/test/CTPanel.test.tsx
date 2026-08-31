import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CTPanel } from "../components/assessments/CTPanel";
import type { ScheduleEntry } from "../api/scheduleApi.js";
import type { ApiResponse } from "../types/auth.js";
import type { CTEntry } from "../types/assessments.js";

// ── Mock the API modules so no real HTTP calls are made ───────────────────────
vi.mock("../api/assessments.js", () => ({
  ctApi: {
    schedule: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock("../api/scheduleApi.js", () => ({
  getSchedules: vi.fn(),
}));

import { ctApi } from "../api/assessments.js";
import { getSchedules } from "../api/scheduleApi.js";

const mockGetSchedules = vi.mocked(getSchedules);

// ── Shared fixtures (typed to match ScheduleEntry exactly) ────────────────────
const mockCT: ScheduleEntry = {
  id: "ct-1",
  type: "CT",
  status: "SCHEDULED",
  batchId: "batch-1",
  teacherId: "teacher-1",
  roomId: "room-1",
  topic: "Midterm Revision",
  date: "2026-09-10T00:00:00.000Z",
  startTime: "2026-09-10T09:00:00.000Z",
  endTime: "2026-09-10T10:30:00.000Z",
  course: { id: "c-1", code: "CSE301", name: "Algorithms" },
  room: { id: "room-1", roomNumber: "R-101", type: "CLASSROOM" },
  batch: { id: "batch-1", name: "Batch 51" },
  teacher: { id: "teacher-1", name: "Dr. Anup", email: "anup@uni.edu" },
};

const mockClassSlot: ScheduleEntry = {
  id: "slot-1",
  type: "CLASS",
  status: "SCHEDULED",
  batchId: "batch-1",
  teacherId: "teacher-1",
  roomId: "room-2",
  topic: undefined,
  date: "2026-09-15T00:00:00.000Z",
  startTime: "2026-09-15T11:00:00.000Z",
  endTime: "2026-09-15T12:30:00.000Z",
  course: { id: "c-2", code: "CSE401", name: "OS" },
  room: { id: "room-2", roomNumber: "R-202", type: "CLASSROOM" },
  batch: { id: "batch-1", name: "Batch 51" },
  teacher: { id: "teacher-1", name: "Dr. Anup", email: "anup@uni.edu" },
};

// A minimal ApiResponse<CTEntry> for the cancel mock
const cancelOkResponse: ApiResponse<CTEntry> = {
  success: true,
  data: {
    id: "ct-1",
    topic: "Midterm Revision",
    date: "2026-09-10T00:00:00.000Z",
    startTime: "2026-09-10T09:00:00.000Z",
    endTime: "2026-09-10T10:30:00.000Z",
    room: { roomNumber: "R-101" },
    course: { code: "CSE301", name: "Algorithms" },
    batch: { name: "Batch 51" },
    teacher: { name: "Dr. Anup" },
  },
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("CTPanel Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator while fetching data", async () => {
    mockGetSchedules.mockReturnValue(new Promise(() => {}));
    render(<CTPanel />);
    expect(screen.getByText(/loading ct schedule/i)).toBeInTheDocument();
  });

  it("renders the CT heading and Schedule CT button", async () => {
    mockGetSchedules.mockResolvedValue([]);
    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByText(/class tests \(ct\)/i)).toBeInTheDocument()
    );
    expect(
      screen.getByRole("button", { name: /\+ schedule ct/i })
    ).toBeInTheDocument();
  });

  it("shows empty state message when no CTs exist", async () => {
    mockGetSchedules.mockResolvedValue([]);
    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByText(/no cts scheduled/i)).toBeInTheDocument()
    );
  });

  it("renders a CT card with topic, course code and room", async () => {
    mockGetSchedules.mockResolvedValue([mockCT]);
    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByText("Midterm Revision")).toBeInTheDocument()
    );
    expect(screen.getByText("CSE301")).toBeInTheDocument();
    expect(screen.getByText(/R-101/i)).toBeInTheDocument();
  });

  it("opens the Schedule CT modal when the button is clicked", async () => {
    mockGetSchedules.mockResolvedValue([mockClassSlot]);
    render(<CTPanel />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /\+ schedule ct/i })
      ).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /\+ schedule ct/i }));
    expect(screen.getByRole("heading", { name: /^schedule ct$/i })).toBeInTheDocument();
  });

  it("opens the cancel confirmation dialog when 'Cancel CT' is clicked", async () => {
    mockGetSchedules.mockResolvedValue([mockCT]);
    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel ct/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel ct/i }));
    expect(
      screen.getByText(/are you sure you want to cancel this ct/i)
    ).toBeInTheDocument();
  });

  it("closes the cancel dialog when 'Keep CT' is clicked", async () => {
    mockGetSchedules.mockResolvedValue([mockCT]);
    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel ct/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel ct/i }));
    fireEvent.click(screen.getByRole("button", { name: /keep ct/i }));
    expect(
      screen.queryByText(/are you sure you want to cancel this ct/i)
    ).not.toBeInTheDocument();
  });

  it("calls ctApi.cancel and reloads data on confirm", async () => {
    vi.mocked(ctApi.cancel).mockResolvedValue(cancelOkResponse);
    mockGetSchedules
      .mockResolvedValueOnce([mockCT])
      .mockResolvedValueOnce([]);

    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel ct/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel ct/i }));
    // Both the card button and dialog button match "cancel ct" — pick the last one
    const allCancelButtons = screen.getAllByRole("button", { name: /cancel ct/i });
    fireEvent.click(allCancelButtons[allCancelButtons.length - 1]);

    await waitFor(() => expect(ctApi.cancel).toHaveBeenCalledWith("ct-1", "teacher-1"));
    await waitFor(() => expect(screen.getByText(/no cts scheduled/i)).toBeInTheDocument());
  });

  it("shows an error alert when the API call fails", async () => {
    const apiError = Object.assign(new Error("Server error"), {
      response: { data: { message: "Server error" } },
    });
    mockGetSchedules.mockRejectedValue(apiError);
    render(<CTPanel />);
    await waitFor(() =>
      expect(screen.getByText("Server error")).toBeInTheDocument()
    );
  });
});
