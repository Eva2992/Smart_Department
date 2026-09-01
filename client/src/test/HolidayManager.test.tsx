import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HolidayManager } from "../components/HolidayManager";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getHolidays: vi.fn(),
    declareHoliday: vi.fn(),
    deleteHoliday: vi.fn(),
  };
});

describe("HolidayManager Component", () => {
  const mockHolidays = [
    {
      id: "hol-1",
      date: "2026-09-15T00:00:00.000Z",
      reason: "University Foundation Day",
      scope: "ALL" as const,
      batchId: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders calendar view by default and switches to list view", async () => {
    vi.mocked(scheduleApi.getHolidays).mockResolvedValue(mockHolidays);

    render(<HolidayManager userRole="ADMIN" onHolidayChanged={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Holiday Calendar View/)).toBeInTheDocument();
      expect(screen.getByText(/Declared Holidays List/)).toBeInTheDocument();
    });

    // Switch to List View
    const listTabBtn = screen.getByText(/Declared Holidays List/);
    fireEvent.click(listTabBtn);

    await waitFor(() => {
      expect(screen.getByText("Department Academic Holidays")).toBeInTheDocument();
      expect(screen.getByText("Declare Academic Holiday")).toBeInTheDocument();
      expect(screen.getByText("✕ Remove & Restore")).toBeInTheDocument();
    });
  });

  it("opens confirmation modal on delete and restores classes when confirmed", async () => {
    vi.mocked(scheduleApi.getHolidays).mockResolvedValue(mockHolidays);
    vi.mocked(scheduleApi.deleteHoliday).mockResolvedValue({
      success: true,
      restoredClassesCount: 3,
      message: "Holiday removed and classes restored.",
    });

    const mockChanged = vi.fn();
    render(<HolidayManager userRole="ADMIN" onHolidayChanged={mockChanged} />);

    // Switch to List View
    const listTabBtn = screen.getByText(/Declared Holidays List/);
    fireEvent.click(listTabBtn);

    await waitFor(() => {
      expect(screen.getByText("✕ Remove & Restore")).toBeInTheDocument();
    });

    // Click Remove & Restore button
    fireEvent.click(screen.getByText("✕ Remove & Restore"));

    // Modal should appear
    expect(screen.getByText("Remove Holiday & Restore Classes?")).toBeInTheDocument();
    expect(
      screen.getByText(/will automatically restore all previously cancelled classes/)
    ).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole("button", { name: "Proceed with Restoration" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(scheduleApi.deleteHoliday).toHaveBeenCalledWith("hol-1");
      expect(mockChanged).toHaveBeenCalled();
    });
  });
});
