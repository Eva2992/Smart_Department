import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleService } from "../../src/services/scheduleService.js";
import { prisma } from "../../src/lib/prisma.js";
import {
  Role,
  ScheduleEntryStatus,
  ClassChangeRequestType,
  ClassChangeRequestStatus,
} from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    scheduleEntry: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    classChangeRequest: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: "s-1" }, { id: "s-2" }]),
    },
    notification: {
      create: vi.fn().mockResolvedValue({ id: "notif-1" }),
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  },
}));

describe("scheduleService - Class Change Requests (FR-17 & FR-18)", () => {
  const teacherActor = {
    id: "teacher-1",
    email: "teacher1@juniv.edu",
    name: "Dr. Teacher One",
    role: Role.TEACHER,
    teacherUniqueId: "T-001",
  };

  const otherTeacherActor = {
    id: "teacher-2",
    email: "teacher2@juniv.edu",
    name: "Dr. Teacher Two",
    role: Role.TEACHER,
    teacherUniqueId: "T-002",
  };

  const studentActor = {
    id: "student-1",
    email: "student1@juniv.edu",
    name: "Student One",
    role: Role.STUDENT,
    batchId: "batch-52",
  };

  const crActor = {
    id: "cr-1",
    email: "cr1@juniv.edu",
    name: "CR One",
    role: Role.CR,
    batchId: "batch-52",
  };

  const studentOtherBatch = {
    id: "student-2",
    email: "student2@juniv.edu",
    name: "Student Two",
    role: Role.STUDENT,
    batchId: "batch-53",
  };

  const sampleEntry = {
    id: "entry-1",
    date: new Date("2026-09-10"),
    startTime: new Date("2026-09-10T09:00:00Z"),
    endTime: new Date("2026-09-10T10:30:00Z"),
    roomId: "r-101",
    teacherId: "teacher-1",
    batchId: "batch-52",
    status: ScheduleEntryStatus.SCHEDULED,
    course: { id: "c-1", name: "Algorithms", code: "CSE 401" },
    teacher: { id: "teacher-1", name: "Dr. Teacher One", teacherUniqueId: "T-001" },
    room: { id: "r-101", roomNumber: "R-101" },
    batch: { id: "batch-52", name: "52nd Batch" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createChangeRequest", () => {
    it("should reject student from another batch", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);

      await expect(
        scheduleService.createChangeRequest(
          "entry-1",
          { type: ClassChangeRequestType.CANCEL, reason: "Exam clash" },
          studentOtherBatch as any
        )
      ).rejects.toThrow("own batch");
    });

    it("should reject request if class is already cancelled", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.CANCELLED,
      });

      await expect(
        scheduleService.createChangeRequest(
          "entry-1",
          { type: ClassChangeRequestType.CANCEL, reason: "Exam clash" },
          studentActor as any
        )
      ).rejects.toThrow("already cancelled");
    });

    it("should reject request if class is on a declared holiday", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.HOLIDAY,
      });

      await expect(
        scheduleService.createChangeRequest(
          "entry-1",
          { type: ClassChangeRequestType.CANCEL, reason: "Holiday conflict" },
          studentActor as any
        )
      ).rejects.toThrow("declared holiday");
    });

    it("should reject duplicate pending request from same student for same class and type", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.classChangeRequest.findFirst as any).mockResolvedValue({
        id: "req-existing",
        status: ClassChangeRequestStatus.PENDING,
      });

      await expect(
        scheduleService.createChangeRequest(
          "entry-1",
          { type: ClassChangeRequestType.CANCEL, reason: "Duplicate request" },
          studentActor as any
        )
      ).rejects.toThrow("already have an active pending");
    });

    it("should successfully create a cancellation request (FR-17) and notify teacher", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.classChangeRequest.findFirst as any).mockResolvedValue(null);

      const createdRecord = {
        id: "req-1",
        scheduleEntryId: "entry-1",
        type: ClassChangeRequestType.CANCEL,
        status: ClassChangeRequestStatus.PENDING,
        reason: "Faculty sickness",
        requestedById: studentActor.id,
        teacherId: "teacher-1",
      };
      (prisma.classChangeRequest.create as any).mockResolvedValue(createdRecord);

      const result = await scheduleService.createChangeRequest(
        "entry-1",
        { type: ClassChangeRequestType.CANCEL, reason: "Faculty sickness" },
        studentActor as any
      );

      expect(prisma.classChangeRequest.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: studentActor.id,
            action: "SUBMIT_CLASS_CHANGE_REQUEST",
          }),
        })
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "teacher-1",
            type: "CLASS_CHANGE_REQUEST_SUBMITTED",
          }),
        })
      );
      expect(result.id).toBe("req-1");
    });

    it("should successfully create a reschedule request (FR-18) with preferred date and time", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.classChangeRequest.findFirst as any).mockResolvedValue(null);

      const createdRecord = {
        id: "req-2",
        scheduleEntryId: "entry-1",
        type: ClassChangeRequestType.RESCHEDULE,
        status: ClassChangeRequestStatus.PENDING,
        reason: "Requesting move to avoid exam",
        preferredDate: new Date("2026-09-12"),
        preferredStartTime: new Date("2026-09-12T10:00:00Z"),
        preferredEndTime: new Date("2026-09-12T11:30:00Z"),
        requestedById: crActor.id,
        teacherId: "teacher-1",
      };
      (prisma.classChangeRequest.create as any).mockResolvedValue(createdRecord);

      const result = await scheduleService.createChangeRequest(
        "entry-1",
        {
          type: ClassChangeRequestType.RESCHEDULE,
          reason: "Requesting move to avoid exam",
          preferredDate: "2026-09-12",
          preferredStartTime: "10:00",
          preferredEndTime: "11:30",
        },
        crActor as any
      );

      expect(prisma.classChangeRequest.create).toHaveBeenCalled();
      expect(result.type).toBe(ClassChangeRequestType.RESCHEDULE);
    });
  });

  describe("getChangeRequests", () => {
    it("should scope requests to teacher for teacher actor", async () => {
      (prisma.classChangeRequest.findMany as any).mockResolvedValue([
        { id: "req-1", teacherId: "teacher-1" },
      ]);

      const requests = await scheduleService.getChangeRequests({}, teacherActor as any);

      expect(prisma.classChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teacherId: "teacher-1",
          }),
        })
      );
      expect(requests).toHaveLength(1);
    });

    it("should scope requests to student batch for student actor", async () => {
      (prisma.classChangeRequest.findMany as any).mockResolvedValue([
        { id: "req-1", scheduleEntry: { batchId: "batch-52" } },
      ]);

      const requests = await scheduleService.getChangeRequests({}, studentActor as any);

      expect(prisma.classChangeRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduleEntry: { batchId: "batch-52" },
          }),
        })
      );
      expect(requests).toHaveLength(1);
    });
  });

  describe("reviewChangeRequest", () => {
    const pendingCancelRequest = {
      id: "req-cancel",
      scheduleEntryId: "entry-1",
      type: ClassChangeRequestType.CANCEL,
      status: ClassChangeRequestStatus.PENDING,
      reason: "Sick leave",
      requestedById: "student-1",
      teacherId: "teacher-1",
      scheduleEntry: sampleEntry,
      requestedBy: studentActor,
    };

    const pendingRescheduleRequest = {
      id: "req-reschedule",
      scheduleEntryId: "entry-1",
      type: ClassChangeRequestType.RESCHEDULE,
      status: ClassChangeRequestStatus.PENDING,
      reason: "Lab exam clash",
      preferredDate: new Date("2026-09-12"),
      preferredStartTime: new Date("2026-09-12T10:00:00Z"),
      preferredEndTime: new Date("2026-09-12T11:30:00Z"),
      preferredRoomId: "r-102",
      requestedById: "student-1",
      teacherId: "teacher-1",
      scheduleEntry: sampleEntry,
      requestedBy: studentActor,
    };

    it("should throw 404 if request not found", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue(null);

      await expect(
        scheduleService.reviewChangeRequest(
          "invalid-id",
          { action: "APPROVE" },
          teacherActor as any
        )
      ).rejects.toThrow("not found");
    });

    it("should throw 400 if request is already reviewed", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue({
        ...pendingCancelRequest,
        status: ClassChangeRequestStatus.APPROVED,
      });

      await expect(
        scheduleService.reviewChangeRequest(
          "req-cancel",
          { action: "APPROVE" },
          teacherActor as any
        )
      ).rejects.toThrow("already been reviewed");
    });

    it("should throw 403 if another teacher attempts review", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue(pendingCancelRequest);

      await expect(
        scheduleService.reviewChangeRequest(
          "req-cancel",
          { action: "APPROVE" },
          otherTeacherActor as any
        )
      ).rejects.toThrow("do not have permission");
    });

    it("should allow teacher to deny request with denialReason and notify student", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue(pendingCancelRequest);
      (prisma.classChangeRequest.update as any).mockResolvedValue({
        ...pendingCancelRequest,
        status: ClassChangeRequestStatus.DENIED,
        denialReason: "Course syllabus is behind schedule",
      });

      const result = await scheduleService.reviewChangeRequest(
        "req-cancel",
        { action: "DENY", denialReason: "Course syllabus is behind schedule" },
        teacherActor as any
      );

      expect(prisma.classChangeRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-cancel" },
          data: expect.objectContaining({
            status: ClassChangeRequestStatus.DENIED,
            denialReason: "Course syllabus is behind schedule",
          }),
        })
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "student-1",
            type: "CLASS_CHANGE_REQUEST_REVIEWED",
          }),
        })
      );
      expect(result.status).toBe(ClassChangeRequestStatus.DENIED);
    });

    it("should approve CANCEL request and trigger cancelClass (FR-17 flow)", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue(pendingCancelRequest);
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.scheduleEntry.update as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.CANCELLED,
      });
      (prisma.classChangeRequest.update as any).mockResolvedValue({
        ...pendingCancelRequest,
        status: ClassChangeRequestStatus.APPROVED,
      });

      const result = await scheduleService.reviewChangeRequest(
        "req-cancel",
        { action: "APPROVE" },
        teacherActor as any
      );

      expect(prisma.scheduleEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-1" },
          data: expect.objectContaining({ status: ScheduleEntryStatus.CANCELLED }),
        })
      );
      expect(prisma.classChangeRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-cancel" },
          data: expect.objectContaining({ status: ClassChangeRequestStatus.APPROVED }),
        })
      );
      expect(result.status).toBe(ClassChangeRequestStatus.APPROVED);
    });

    it("should approve RESCHEDULE request with proposed slot (FR-18 flow)", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue(pendingRescheduleRequest);
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.scheduleEntry.update as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.RESCHEDULED,
      });
      (prisma.classChangeRequest.update as any).mockResolvedValue({
        ...pendingRescheduleRequest,
        status: ClassChangeRequestStatus.APPROVED,
      });

      const result = await scheduleService.reviewChangeRequest(
        "req-reschedule",
        { action: "APPROVE" },
        teacherActor as any
      );

      expect(prisma.scheduleEntry.update).toHaveBeenCalled();
      expect(prisma.classChangeRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-reschedule" },
          data: expect.objectContaining({ status: ClassChangeRequestStatus.APPROVED }),
        })
      );
      expect(result.status).toBe(ClassChangeRequestStatus.APPROVED);
    });

    it("should approve RESCHEDULE request with modification by teacher (FR-18 flow)", async () => {
      (prisma.classChangeRequest.findUnique as any).mockResolvedValue(pendingRescheduleRequest);
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.scheduleEntry.update as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.RESCHEDULED,
      });
      (prisma.classChangeRequest.update as any).mockResolvedValue({
        ...pendingRescheduleRequest,
        status: ClassChangeRequestStatus.APPROVED,
      });

      const result = await scheduleService.reviewChangeRequest(
        "req-reschedule",
        {
          action: "APPROVE",
          modifiedDate: "2026-09-13",
          modifiedStartTime: "13:30",
          modifiedEndTime: "15:00",
          modifiedRoomId: "r-103",
        },
        teacherActor as any
      );

      expect(prisma.scheduleEntry.update).toHaveBeenCalled();
      expect(result.status).toBe(ClassChangeRequestStatus.APPROVED);
    });
  });
});
