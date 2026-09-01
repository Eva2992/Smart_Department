import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { UpcomingHolidaysWidget } from "../components/UpcomingHolidaysWidget";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getUpcomingHolidays: vi.fn(),
  };
});

describe("UpcomingHolidaysWidget Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders upcoming holidays list with amber accent and Poppins font", async () => {
    vi.mocked(scheduleApi.getUpcomingHolidays).mockResolvedValue([
      {
        id: "hol-1",
        date: "2026-09-15T00:00:00.000Z",
        reason: "Independence Day",
        scope: "ALL",
      },
      {
        id: "hol-2",
        date: "2026-10-01T00:00:00.000Z",
        reason: "Autumn Break",
        scope: "BATCH",
        batchId: "batch-52",
        batch: { id: "batch-52", name: "52nd" },
      },
    ]);

    render(
      <BrowserRouter>
        <UpcomingHolidaysWidget />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Independence Day")).toBeInTheDocument();
      expect(screen.getByText("Autumn Break")).toBeInTheDocument();
      expect(screen.getByText("All Batches")).toBeInTheDocument();
      expect(screen.getByText("Batch 52nd")).toBeInTheDocument();
      expect(screen.getByText("View All →")).toBeInTheDocument();
    });
  });

  it("displays empty state when no upcoming holidays are scheduled", async () => {
    vi.mocked(scheduleApi.getUpcomingHolidays).mockResolvedValue([]);

    render(
      <BrowserRouter>
        <UpcomingHolidaysWidget />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(
        screen.getByText("No upcoming holidays scheduled in the academic calendar.")
      ).toBeInTheDocument();
    });
  });
});
