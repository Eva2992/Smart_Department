import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RescheduleModal } from "../components/RescheduleModal";
import { StudentChangeRequestModal } from "../components/StudentChangeRequestModal";
import { TeacherChangeRequestsPanel } from "../components/TeacherChangeRequestsPanel";
import * as scheduleApi from "../api/scheduleApi";

vi.mock("../api/scheduleApi", async () => {
  const actual = await vi.importActual<typeof scheduleApi>("../api/scheduleApi");
  return {
    ...actual,
    checkConflict: vi.fn(),
    rescheduleClass: vi.fn(),
    updateClassTime: vi.fn(),
    getSuggestedSlots: vi.fn(),
    submitChangeRequest: vi.fn(),
    getChangeRequests: vi.fn(),
    reviewChangeRequest: vi.fn(),
  };
});

vi.mock("../context/useAuth.js", () => ({
  useAuth: () => ({
    user: {
      id: "teacher-1",
      name: "Dr. Anup",
      role: "TEACHER",
      batchId: "batch-52",
    },
  }),
}));

describe("Class Update & Reschedule Management Frontend Component Tests", () => {
  const sampleEntry: scheduleApi.ScheduleEntry = {
    id: "entry-1",
    type: "CLASS",
    status: "SCHEDULED",
    batchId: "batch-52",
    teacherId: "teacher-1",
    roomId: "r-101",
    date: "2026-09-01T00:00:00.000Z",
    startTime: "09:00",
    endTime: "10:30",
    course: { id: "c-1", name: "Software Engineering", code: "CSE 404" },
    teacher: { id: "teacher-1", name: "Dr. Anup", email: "anup@juniv.edu" },
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

  describe("RescheduleModal - FR-16 Same-Day Time Update & FR-19 Suggestions", () => {
    it("should switch to Same-Day Time tab and call updateClassTime on submit (FR-16)", async () => {
      vi.mocked(scheduleApi.checkConflict).mockResolvedValue({
        hasConflict: false,
        conflicts: [],
      });
      vi.mocked(scheduleApi.updateClassTime).mockResolvedValue(sampleEntry);
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <RescheduleModal
          isOpen={true}
          onClose={onClose}
          entry={sampleEntry}
          rooms={sampleRooms}
          onSuccess={onSuccess}
        />
      );

      // Switch to Same-Day tab
      const sameDayTabBtn = screen.getByText(/Same-Day Time/);
      fireEvent.click(sameDayTabBtn);

      expect(screen.getByText(/Same-Day Adjustment:/)).toBeInTheDocument();

      const submitBtn = screen.getByText("Confirm Time Update");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(scheduleApi.updateClassTime).toHaveBeenCalledWith(
          "entry-1",
          expect.objectContaining({
            startTime: "09:00",
            endTime: "10:30",
          })
        );
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should render suggested slots in reschedule tab and populate time on click (FR-19)", async () => {
      vi.mocked(scheduleApi.getSuggestedSlots).mockResolvedValue({
        date: "2026-09-01",
        isHoliday: false,
        slots: [
          {
            startTime: "13:30",
            endTime: "15:00",
            label: "1:30 PM - 3:00 PM",
            isAvailable: true,
            availableRooms: [{ id: "r-102", roomNumber: "R-102", type: "CLASSROOM" }],
          },
        ],
      });
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

      // Default is reschedule tab
      await waitFor(() => {
        expect(screen.getByText("1:30 PM - 3:00 PM")).toBeInTheDocument();
        expect(screen.getByText("✓ Free")).toBeInTheDocument();
      });

      // Click the suggested slot
      fireEvent.click(screen.getByText("1:30 PM - 3:00 PM"));

      const submitBtn = screen.getByText("Confirm Reschedule");
      expect(submitBtn).not.toBeDisabled();
    });
  });

  describe("StudentChangeRequestModal - FR-17 & FR-18", () => {
    it("should submit student cancellation request (FR-17)", async () => {
      vi.mocked(scheduleApi.submitChangeRequest).mockResolvedValue({} as any);
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <StudentChangeRequestModal
          isOpen={true}
          onClose={onClose}
          entry={sampleEntry}
          rooms={sampleRooms}
          onSuccess={onSuccess}
        />
      );

      // Default is CANCEL
      const reasonInput = screen.getByPlaceholderText(/Clash with university cultural program/);
      fireEvent.change(reasonInput, { target: { value: "Preparation for final exam" } });

      const submitBtn = screen.getByText("Submit Request");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(scheduleApi.submitChangeRequest).toHaveBeenCalledWith("entry-1", {
          type: "CANCEL",
          reason: "Preparation for final exam",
        });
        expect(onSuccess).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });

    it("should switch to reschedule and submit with preferred slot (FR-18)", async () => {
      vi.mocked(scheduleApi.submitChangeRequest).mockResolvedValue({} as any);
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      render(
        <StudentChangeRequestModal
          isOpen={true}
          onClose={onClose}
          entry={sampleEntry}
          rooms={sampleRooms}
          onSuccess={onSuccess}
        />
      );

      // Switch to Reschedule
      const rescheduleTabBtn = screen.getByText(/Reschedule Request/);
      fireEvent.click(rescheduleTabBtn);

      const reasonInput = screen.getByPlaceholderText(/Clash with lab exam/);
      fireEvent.change(reasonInput, { target: { value: "Lab contest on the same morning" } });

      const submitBtn = screen.getByText("Submit Request");
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(scheduleApi.submitChangeRequest).toHaveBeenCalledWith(
          "entry-1",
          expect.objectContaining({
            type: "RESCHEDULE",
            reason: "Lab contest on the same morning",
          })
        );
      });
    });
  });

  describe("TeacherChangeRequestsPanel - FR-17 & FR-18 Review", () => {
    const sampleRequest: scheduleApi.ClassChangeRequest = {
      id: "req-1",
      scheduleEntryId: "entry-1",
      type: "CANCEL",
      status: "PENDING",
      reason: "Course clash",
      requestedById: "student-1",
      teacherId: "teacher-1",
      createdAt: "2026-09-01T10:00:00.000Z",
      updatedAt: "2026-09-01T10:00:00.000Z",
      scheduleEntry: sampleEntry,
      requestedBy: {
        id: "student-1",
        name: "Student One",
        email: "student@juniv.edu",
        role: "STUDENT",
      },
    };

    it("should render change requests list and allow approving cancellation", async () => {
      vi.mocked(scheduleApi.getChangeRequests).mockResolvedValue([sampleRequest]);
      vi.mocked(scheduleApi.reviewChangeRequest).mockResolvedValue({
        ...sampleRequest,
        status: "APPROVED",
      });

      render(<TeacherChangeRequestsPanel rooms={sampleRooms} />);

      await waitFor(() => {
        expect(screen.getByText("⚠️ Cancellation Request")).toBeInTheDocument();
        expect(screen.getByText(/"Course clash"/)).toBeInTheDocument();
      });

      const approveBtn = screen.getByText("✓ Approve Cancellation");
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(scheduleApi.reviewChangeRequest).toHaveBeenCalledWith("req-1", {
          action: "APPROVE",
        });
      });
    });

    it("should open denial dialog and deny request with feedback", async () => {
      vi.mocked(scheduleApi.getChangeRequests).mockResolvedValue([sampleRequest]);
      vi.mocked(scheduleApi.reviewChangeRequest).mockResolvedValue({
        ...sampleRequest,
        status: "DENIED",
      });

      render(<TeacherChangeRequestsPanel rooms={sampleRooms} />);

      await waitFor(() => {
        expect(screen.getByText("✕ Deny")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("✕ Deny"));

      expect(screen.getByText("✕ Deny Change Request")).toBeInTheDocument();

      const reasonInput = screen.getByPlaceholderText(/Class syllabus is behind schedule/);
      fireEvent.change(reasonInput, { target: { value: "Exam syllabus must be completed" } });

      fireEvent.click(screen.getByText("Confirm Denial"));

      await waitFor(() => {
        expect(scheduleApi.reviewChangeRequest).toHaveBeenCalledWith("req-1", {
          action: "DENY",
          denialReason: "Exam syllabus must be completed",
        });
      });
    });
  });
});
