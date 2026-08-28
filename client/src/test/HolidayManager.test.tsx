import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  it("should render holiday list and admin declaration form", async () => {
    vi.mocked(scheduleApi.getHolidays).mockResolvedValue([
      {
        id: "hol-1",
        date: "2026-09-15T00:00:00.000Z",
        reason: "University Foundation Day",
        scope: "ALL",
      },
    ]);

    render(<HolidayManager userRole="ADMIN" onHolidayChanged={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("University Foundation Day")).toBeInTheDocument();
      expect(screen.getByText("Declare Holiday")).toBeInTheDocument();
      expect(screen.getByText("✕ Remove & Restore")).toBeInTheDocument();
    });
  });
});
