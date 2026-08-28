import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RoomMatrix } from "../components/RoomMatrix";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getRoomAvailability: vi.fn(),
  };
});

describe("RoomMatrix Component", () => {
  it("should render 8-room matrix table with slot statuses", async () => {
    vi.mocked(scheduleApi.getRoomAvailability).mockResolvedValue([
      {
        room: { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
        date: "2026-09-01",
        slots: [
          {
            startTime: "08:30",
            endTime: "10:00",
            label: "8:30 AM - 10:00 AM",
            isAvailable: false,
            booking: {
              id: "b-1",
              courseCode: "CSE 404",
              teacherName: "Dr. Anup",
              batchName: "52nd Batch",
            },
          },
          {
            startTime: "10:00",
            endTime: "11:30",
            label: "10:00 AM - 11:30 AM",
            isAvailable: true,
          },
        ],
      },
    ]);

    render(<RoomMatrix />);

    await waitFor(() => {
      expect(screen.getByText("R-101")).toBeInTheDocument();
      expect(screen.getByText("CSE 404")).toBeInTheDocument();
      expect(screen.getByText("✓ Free")).toBeInTheDocument();
    });
  });
});
