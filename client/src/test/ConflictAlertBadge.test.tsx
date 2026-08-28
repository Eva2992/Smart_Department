import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConflictAlertBadge } from "../components/ConflictAlertBadge";

describe("ConflictAlertBadge Component", () => {
  it("should render real-time loading indicator when isChecking is true", () => {
    render(<ConflictAlertBadge isChecking={true} />);

    expect(
      screen.getByText(/Evaluating room, teacher & batch availability in real-time/i)
    ).toBeInTheDocument();
  });

  it("should render green slot available banner when hasConflict is false", () => {
    render(<ConflictAlertBadge isChecking={false} hasConflict={false} conflicts={[]} />);

    expect(screen.getByTestId("conflict-clear-badge")).toBeInTheDocument();
    expect(
      screen.getByText("Slot Available — No Room, Teacher, or Batch Conflicts.")
    ).toBeInTheDocument();
  });

  it("should render rose-red conflict warning banner with detailed breakdown for Room, Teacher, and Batch clashes", () => {
    const sampleConflicts = [
      {
        type: "ROOM" as const,
        message: "Room R-101 is already booked by Batch 51 for CSE 301 from 09:00 to 10:30.",
        conflictingEntry: {
          id: "e-1",
          date: "2026-09-01",
          startTime: "09:00",
          endTime: "10:30",
          type: "CLASS",
          status: "SCHEDULED",
        },
      },
      {
        type: "TEACHER" as const,
        message: "Dr. Anup is already teaching in Lab 2 from 09:00 to 10:30.",
        conflictingEntry: {
          id: "e-2",
          date: "2026-09-01",
          startTime: "09:00",
          endTime: "10:30",
          type: "CLASS",
          status: "SCHEDULED",
        },
      },
    ];

    render(
      <ConflictAlertBadge
        isChecking={false}
        hasConflict={true}
        conflicts={sampleConflicts}
        summaryMessage="2 scheduling clashes detected"
      />
    );

    expect(screen.getByTestId("conflict-alert-banner")).toBeInTheDocument();
    expect(screen.getByText("❌ Conflict Detected")).toBeInTheDocument();
    expect(screen.getByText("2 scheduling clashes detected")).toBeInTheDocument();
    expect(screen.getByText("ROOM")).toBeInTheDocument();
    expect(
      screen.getByText("Room R-101 is already booked by Batch 51 for CSE 301 from 09:00 to 10:30.")
    ).toBeInTheDocument();
    expect(screen.getByText("TEACHER")).toBeInTheDocument();
    expect(
      screen.getByText("Dr. Anup is already teaching in Lab 2 from 09:00 to 10:30.")
    ).toBeInTheDocument();
  });

  it("should render nothing when no conflict check has been triggered", () => {
    const { container } = render(<ConflictAlertBadge />);
    expect(container.firstChild).toBeNull();
  });
});
