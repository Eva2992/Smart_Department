import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CTPanel } from "../components/assessments/CTPanel";

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

// ── Shared fixtures ───────────────────────────────────────────────────────────
const mockCT = {
  id: "ct-1",
  type: "CT",
  status: "SCHEDULED",
  topic: "Midterm Revision",
  date: "2026-09-10T00:00:00.000Z",
  startTime: "2026-09-10T09:00:00.000Z",
  endTime: "2026-09-10T10:30:00.000Z",
  course: { code: "CSE301", name: "Algorithms" },
  room: { roomNumber: "R-101" },
  batch: { name: "Batch 51" },
  teacher: { name: "Dr. Anup" },
};

const mockClassSlot = {
  id: "slot-1",
  type: "CLASS",
  status: "SCHEDULED",
  topic: null,
  date: "2026-09-15T00:00:00.000Z",
  startTime: "2026-09-15T11:00:00.000Z",
  endTime: "2026-09-15T12:30:00.000Z",
  course: { code: "CSE401", name: "OS" },
  room: { roomNumber: "R-202" },
  batch: { name: "Batch 51" },
  teacher: { name: "Dr. Anup" },
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("CTPanel Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading indicator while fetching data", async () => {
    // Never resolves — keeps panel in loading state
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
    // The modal heading is "Schedule CT" inside an h3
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
    vi.mocked(ctApi.cancel).mockResolvedValue(undefined);
    mockGetSchedules
      .mockResolvedValueOnce([mockCT]) // initial load
      .mockResolvedValueOnce([]); // after cancel

    render(<CTPanel />);
    // Open the cancel dialog from the card's Cancel CT button
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /cancel ct/i })).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel ct/i }));
    // Click the confirm button inside the dialog (distinct text: "Cancelling..." / "Cancel CT")
    // Use getAllByRole and pick the last one (dialog button)
    const allCancelButtons = screen.getAllByRole("button", { name: /cancel ct/i });
    fireEvent.click(allCancelButtons[allCancelButtons.length - 1]);

    await waitFor(() => expect(ctApi.cancel).toHaveBeenCalledWith("ct-1", "teacher-1"));
    await waitFor(() => expect(screen.getByText(/no cts scheduled/i)).toBeInTheDocument());
  });

  it("shows an error alert when the API call fails", async () => {
    // Must be a plain object with nested structure that our extractor can read
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
