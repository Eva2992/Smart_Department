import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HolidayCalendar } from "../components/HolidayCalendar";
import { type Holiday } from "../api/scheduleApi";

describe("HolidayCalendar Component", () => {
  const mockHolidays: Holiday[] = [
    {
      id: "hol-1",
      date: new Date().toISOString(), // Today
      reason: "University Day",
      scope: "ALL",
    },
    {
      id: "hol-2",
      date: "2026-09-25T00:00:00.000Z",
      reason: "52nd Batch Seminar Off-Day",
      scope: "BATCH",
      batchId: "batch-52",
    },
  ];

  it("renders calendar month, weekday headers, and holidays", () => {
    render(<HolidayCalendar holidays={mockHolidays} />);

    expect(screen.getByText("University Day")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("navigates previous and next months", () => {
    render(<HolidayCalendar holidays={mockHolidays} />);

    const nextBtn = screen.getByLabelText("Next Month");
    fireEvent.click(nextBtn);

    const prevBtn = screen.getByLabelText("Previous Month");
    fireEvent.click(prevBtn);
  });

  it("shows holiday details when a date cell is selected", () => {
    render(<HolidayCalendar holidays={mockHolidays} />);

    const holidayPill = screen.getByText("University Day");
    fireEvent.click(holidayPill);

    expect(screen.getByText(/Details for/)).toBeInTheDocument();
    expect(screen.getByText("Department-Wide")).toBeInTheDocument();
  });

  it("filters holidays by batch if onBatchFilterChange is provided", () => {
    const handleBatchChange = vi.fn();
    render(
      <HolidayCalendar
        holidays={mockHolidays}
        onBatchFilterChange={handleBatchChange}
        selectedBatchId=""
      />
    );

    const batchSelect = screen.getByLabelText("Filter Holidays by Batch");
    fireEvent.change(batchSelect, { target: { value: "batch-52" } });

    expect(handleBatchChange).toHaveBeenCalledWith("batch-52");
  });
});
