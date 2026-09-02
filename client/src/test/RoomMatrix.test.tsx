import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RoomMatrix } from "../components/RoomMatrix";
import * as scheduleApi from "../api/scheduleApi";
import type { RoomScheduleSlot } from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getRoomScheduleGrid: vi.fn(),
  };
});

describe("RoomMatrix Component", () => {
  it("should render 8-room matrix table with slot statuses", async () => {
    vi.mocked(scheduleApi.getRoomScheduleGrid).mockImplementation(async (startDate: string) => {
      const start = new Date(startDate);
      const dates = Array.from({ length: 5 }).map((_, i) => {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        return d.toISOString().split("T")[0];
      });

      const dateMap: Record<string, RoomScheduleSlot[]> = {};
      for (const d of dates) {
        dateMap[d] = [
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
              type: "CLASS",
            },
          },
          {
            startTime: "10:00",
            endTime: "11:30",
            label: "10:00 AM - 11:30 AM",
            isAvailable: true,
            booking: null,
          },
        ];
      }

      return {
        rooms: [{ id: "r-101", roomNumber: "R-101", type: "CLASSROOM" }],
        dates,
        grid: {
          "r-101": dateMap,
        },
      };
    });

    render(<RoomMatrix />);

    await waitFor(() => {
      expect(screen.getByText("R-101")).toBeInTheDocument();
      expect(screen.getByText("CSE 404")).toBeInTheDocument();
      expect(screen.getByText("✓ Free")).toBeInTheDocument();
    });
  });
});
