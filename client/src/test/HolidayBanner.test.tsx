import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HolidayBanner } from "../components/HolidayBanner";
import { type Holiday } from "../api/scheduleApi";

describe("HolidayBanner Component", () => {
  it("renders holiday reason, scope, and date properly", () => {
    const mockHoliday: Holiday = {
      id: "hol-1",
      date: "2026-09-15T00:00:00.000Z",
      reason: "Independence Day",
      scope: "ALL",
      batchId: null,
    };

    render(<HolidayBanner holiday={mockHoliday} />);

    expect(screen.getByText("Independence Day")).toBeInTheDocument();
    expect(screen.getByText("Academic Holiday")).toBeInTheDocument();
    expect(screen.getByText("Department-Wide")).toBeInTheDocument();
    expect(screen.getByText(/2026-09-15/)).toBeInTheDocument();
    expect(
      screen.getByText(/All classes scheduled on this date are automatically suspended/)
    ).toBeInTheDocument();
  });

  it("renders batch-specific holiday scope correctly", () => {
    const mockHoliday: Holiday = {
      id: "hol-2",
      date: "2026-09-20T00:00:00.000Z",
      reason: "52nd Batch Study Break",
      scope: "BATCH",
      batchId: "batch-52",
      batch: { id: "batch-52", name: "52nd" },
    };

    render(<HolidayBanner holiday={mockHoliday} />);

    expect(screen.getByText("52nd Batch Study Break")).toBeInTheDocument();
    expect(screen.getByText("Batch 52nd")).toBeInTheDocument();
  });
});
