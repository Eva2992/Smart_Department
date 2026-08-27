import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RescheduleModal } from "../components/RescheduleModal";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    checkConflict: vi.fn(),
    rescheduleClass: vi.fn(),
  };
});

describe("RescheduleModal Component", () => {
  const sampleEntry: scheduleApi.ScheduleEntry = {
    id: "entry-1",
    type: "CLASS",
    status: "SCHEDULED",
    batchId: "batch-52",
    teacherId: "teacher-anup-1",
    roomId: "r-101",
    date: "2026-09-01T00:00:00.000Z",
    startTime: "09:00",
    endTime: "10:30",
    course: { id: "c-1", name: "Software Engineering", code: "CSE 404" },
    teacher: { id: "teacher-anup-1", name: "Dr. Anup Kumar", email: "anup@juniv.edu" },
    room: { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
    batch: { id: "batch-52", name: "52nd Batch" },
  };

  const sampleRooms = [
    { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
    { id: "r-102", roomNumber: "R-102", type: "CLASSROOM" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should display green 'Slot Available' badge when 3-way conflict check passes", async () => {
    vi.mocked(scheduleApi.checkConflict).mockResolvedValue({
      hasConflict: false,
      conflicts: [],
    });

    render(
      <RescheduleModal
        isOpen={true}
        onClose={vi.fn()}
        entry={sampleEntry}
        rooms={sampleRooms}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Slot Available — No Room, Teacher, or Batch Conflicts.")
      ).toBeInTheDocument();
    });

    const submitBtn = screen.getByText("Confirm Reschedule");
    expect(submitBtn).not.toBeDisabled();
  });

  it("should display red 'Conflict Detected' badge and disable button when clash is returned", async () => {
    vi.mocked(scheduleApi.checkConflict).mockResolvedValue({
      hasConflict: true,
      conflicts: [
        {
          type: "ROOM",
          message: "Room R-101 is already occupied by CSE 301 from 9:00 AM to 10:30 AM",
          conflictingEntry: {
            id: "e-99",
            date: "2026-09-01",
            startTime: "09:00",
            endTime: "10:30",
            type: "CLASS",
          },
        },
      ],
    });

    render(
      <RescheduleModal
        isOpen={true}
        onClose={vi.fn()}
        entry={sampleEntry}
        rooms={sampleRooms}
        onSuccess={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("❌ Conflict Detected")).toBeInTheDocument();
      expect(
        screen.getByText(/Room R-101 is already occupied by CSE 301/)
      ).toBeInTheDocument();
    });

    const submitBtn = screen.getByText("Confirm Reschedule");
    expect(submitBtn).toBeDisabled();
  });
});
