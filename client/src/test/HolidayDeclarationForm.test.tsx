import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HolidayDeclarationForm } from "../components/HolidayDeclarationForm";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    declareHoliday: vi.fn(),
  };
});

describe("HolidayDeclarationForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form inputs with initial state", () => {
    render(<HolidayDeclarationForm />);

    expect(screen.getByText("Declare Academic Holiday")).toBeInTheDocument();
    expect(screen.getByLabelText("Holiday Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Occasion / Reason")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Batches" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Specific Batch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Declare Holiday" })).toBeInTheDocument();
  });

  it("toggles scope selector and shows target batch dropdown", async () => {
    render(<HolidayDeclarationForm />);

    const specificBatchBtn = screen.getByRole("button", { name: "Specific Batch" });
    fireEvent.click(specificBatchBtn);

    expect(screen.getByLabelText("Target Batch")).toBeInTheDocument();
  });

  it("submits holiday declaration successfully", async () => {
    const user = userEvent.setup();
    const mockSuccess = vi.fn();

    vi.mocked(scheduleApi.declareHoliday).mockResolvedValue({
      holiday: {
        id: "hol-1",
        date: "2026-09-15T00:00:00.000Z",
        reason: "Foundation Day",
        scope: "ALL",
      },
      affectedClassesCount: 2,
      message: "Holiday declared successfully.",
    });

    render(<HolidayDeclarationForm onSuccess={mockSuccess} />);

    const reasonInput = screen.getByLabelText("Occasion / Reason");
    await user.type(reasonInput, "Foundation Day");

    const submitBtn = screen.getByRole("button", { name: "Declare Holiday" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(scheduleApi.declareHoliday).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "Foundation Day",
          scope: "ALL",
        })
      );
      expect(mockSuccess).toHaveBeenCalled();
      expect(screen.getByText(/Holiday declared successfully/)).toBeInTheDocument();
    });
  });

  it("displays error message when declaration fails", async () => {
    const user = userEvent.setup();
    vi.mocked(scheduleApi.declareHoliday).mockRejectedValue(new Error("Server error"));

    render(<HolidayDeclarationForm />);

    const reasonInput = screen.getByLabelText("Occasion / Reason");
    await user.type(reasonInput, "Test Holiday");

    const submitBtn = screen.getByRole("button", { name: "Declare Holiday" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
  });
});
