import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { type ScheduleEntry } from "../api/scheduleApi";

describe("ScheduleGrid Component", () => {
  const sampleSchedules: ScheduleEntry[] = [
    {
      id: "e-1",
      type: "CLASS",
      status: "SCHEDULED",
      courseId: "c-1",
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
    },
    {
      id: "e-2",
      type: "CLASS",
      status: "RESCHEDULED",
      courseId: "c-2",
      batchId: "batch-51",
      teacherId: "teacher-farhana-2",
      roomId: "r-102",
      date: "2026-09-01T00:00:00.000Z",
      startTime: "11:00",
      endTime: "12:30",
      course: { id: "c-2", name: "Database Systems", code: "CSE 301" },
      teacher: { id: "teacher-farhana-2", name: "Dr. Farhana", email: "farhana@juniv.edu" },
      room: { id: "r-102", roomNumber: "R-102", type: "CLASSROOM" },
      batch: { id: "batch-51", name: "51st Batch" },
    },
    {
      id: "e-3",
      type: "CLASS",
      status: "CANCELLED",
      courseId: "c-3",
      batchId: "batch-52",
      teacherId: "teacher-anup-1",
      roomId: "r-101",
      date: "2026-09-01T00:00:00.000Z",
      startTime: "14:00",
      endTime: "15:30",
      course: { id: "c-3", name: "SE Lab", code: "CSE 404L" },
      room: { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
      batch: { id: "batch-52", name: "52nd Batch" },
    },
  ];

  it("should render schedule cards with course details and status badges", () => {
    render(
      <ScheduleGrid
        schedules={sampleSchedules}
        loading={false}
        userRole="TEACHER"
        currentUserId="teacher-anup-1"
        onOpenReschedule={vi.fn()}
        onOpenCancel={vi.fn()}
      />
    );

    expect(screen.getByText("CSE 404")).toBeInTheDocument();
    expect(screen.getByText("Software Engineering")).toBeInTheDocument();
    expect(screen.getByText("CSE 301")).toBeInTheDocument();
    expect(screen.getByText("● Scheduled")).toBeInTheDocument();
    expect(screen.getByText("↺ Rescheduled")).toBeInTheDocument();
    expect(screen.getByText("✕ Cancelled")).toBeInTheDocument();
  });

  it("should display action buttons for teacher's own active class and trigger handlers", () => {
    const handleReschedule = vi.fn();
    const handleCancel = vi.fn();

    render(
      <ScheduleGrid
        schedules={sampleSchedules}
        loading={false}
        userRole="TEACHER"
        currentUserId="teacher-anup-1"
        onOpenReschedule={handleReschedule}
        onOpenCancel={handleCancel}
      />
    );

    const rescheduleBtn = screen.getByText("↺ Reschedule");
    fireEvent.click(rescheduleBtn);
    expect(handleReschedule).toHaveBeenCalledWith(sampleSchedules[0]);

    const cancelBtn = screen.getByText("✕ Cancel");
    fireEvent.click(cancelBtn);
    expect(handleCancel).toHaveBeenCalledWith(sampleSchedules[0]);
  });

  it("should show empty state when no schedules match", () => {
    render(
      <ScheduleGrid
        schedules={[]}
        loading={false}
        userRole="STUDENT"
        onOpenReschedule={vi.fn()}
        onOpenCancel={vi.fn()}
      />
    );

    expect(screen.getByText("No Scheduled Classes Found")).toBeInTheDocument();
  });
});
