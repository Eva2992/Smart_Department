import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RoomMatrix } from "../components/RoomMatrix";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    getRoomScheduleGrid: vi.fn(),
    getRoomAvailability: vi.fn(),
  };
});

describe("RoomAvailabilityMatrix Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render rooms with type badges and slot states", async () => {
    const d = new Date();
    const day = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    const weekDates = Array.from({ length: 5 }).map((_, i) => {
      const dt = new Date(sunday);
      dt.setDate(sunday.getDate() + i);
      return dt.toISOString().split("T")[0];
    });

    const mockGrid: Record<string, Record<string, scheduleApi.RoomScheduleSlot[]>> = {
      "r-101": {},
      "r-201": {},
      "r-105": {},
      "r-202": {},
    };

    weekDates.forEach((dateStr) => {
      mockGrid["r-101"][dateStr] = [
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
      mockGrid["r-201"][dateStr] = [];
      mockGrid["r-105"][dateStr] = [];
      mockGrid["r-202"][dateStr] = [
        {
          startTime: "08:30",
          endTime: "10:00",
          label: "8:30 AM - 10:00 AM",
          isAvailable: false,
          booking: {
            id: "b-2",
            courseCode: "AI Seminar",
            title: "AI Seminar",
            teacherName: "Prof. Chairman",
            batchName: "52nd Batch",
            type: "SEMINAR",
          },
        },
      ];
    });

    vi.mocked(scheduleApi.getRoomScheduleGrid).mockResolvedValue({
      rooms: [
        { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
        { id: "r-201", roomNumber: "R-201", type: "COMPUTER_LAB" },
        { id: "r-105", roomNumber: "R-105", type: "ELECTRICAL_LAB" },
        { id: "r-202", roomNumber: "R-202", type: "MULTIPURPOSE" },
      ],
      dates: weekDates,
      grid: mockGrid,
    });

    render(<RoomMatrix />);

    await waitFor(() => {
      expect(screen.getByText("R-101")).toBeInTheDocument();
      expect(screen.getByText("Classroom")).toBeInTheDocument();
      expect(screen.getByText("Computer Lab")).toBeInTheDocument();
      expect(screen.getByText("Electrical Lab")).toBeInTheDocument();
      expect(screen.getByText("Multipurpose")).toBeInTheDocument();
      expect(screen.getByText("CSE 404")).toBeInTheDocument();
      expect(screen.getByText("✓ Free")).toBeInTheDocument();
      expect(screen.getByText("Seminar: AI Seminar")).toBeInTheDocument();
    });
  });

  it("should render week navigation buttons", () => {
    render(<RoomMatrix />);
    expect(screen.getByText(/Prev Week/i)).toBeInTheDocument();
    expect(screen.getByText(/Next Week/i)).toBeInTheDocument();
  });
});
