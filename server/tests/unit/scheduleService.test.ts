import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleService } from "../../src/services/scheduleService.js";
import { conflictService } from "../../src/services/conflictService.js";
import { prisma } from "../../src/lib/prisma.js";
import { Role, ScheduleEntryStatus } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    scheduleEntry: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: "student-1" }, { id: "student-2" }]),
    },
    holiday: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    room: {
      findMany: vi.fn().mockResolvedValue([
        { id: "r-101", roomNumber: "R-101", type: "CLASSROOM" },
        { id: "r-102", roomNumber: "R-102", type: "CLASSROOM" },
      ]),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  },
}));

describe("scheduleService", () => {
  const teacherActor = {
    id: "teacher-1",
    email: "teacher1@juniv.edu",
    role: Role.TEACHER,
    teacherUniqueId: "T-001",
  };

  const otherTeacherActor = {
    id: "teacher-2",
    email: "teacher2@juniv.edu",
    role: Role.TEACHER,
    teacherUniqueId: "T-002",
  };

  const studentActor = {
    id: "student-1",
    email: "student1@juniv.edu",
    role: Role.STUDENT,
    batchId: "batch-52",
  };

  const sampleEntry = {
    id: "entry-1",
    date: new Date("2026-09-01"),
    startTime: new Date("2026-09-01T09:00:00Z"),
    endTime: new Date("2026-09-01T10:30:00Z"),
    roomId: "r-101",
    teacherId: "teacher-1",
    batchId: "batch-52",
    status: ScheduleEntryStatus.SCHEDULED,
    course: { id: "c-1", name: "Software Engineering", code: "CSE 404" },
    teacher: { id: "teacher-1", name: "Dr. Anup", teacherUniqueId: "T-001" },
    room: { id: "r-101", roomNumber: "R-101" },
    batch: { id: "batch-52", name: "52nd Batch" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rescheduleClass", () => {
    it("should reject student or unauthorized teacher from rescheduling", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);

      await expect(
        scheduleService.rescheduleClass(
          "entry-1",
          { date: "2026-09-02", startTime: "11:00", endTime: "12:30" },
          studentActor as any
        )
      ).rejects.toThrow("do not have permission");

      await expect(
        scheduleService.rescheduleClass(
          "entry-1",
          { date: "2026-09-02", startTime: "11:00", endTime: "12:30" },
          otherTeacherActor as any
        )
      ).rejects.toThrow("do not have permission");
    });

    it("should block rescheduling with 409 error if conflictService finds an overlap", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      vi.spyOn(conflictService, "checkConflict").mockResolvedValueOnce({
        hasConflict: true,
        conflicts: [
          {
            type: "ROOM",
            message: "Room R-101 is already occupied",
            conflictingEntry: {} as any,
          },
        ],
        summaryMessage: "Room conflict detected",
      });

      await expect(
        scheduleService.rescheduleClass(
          "entry-1",
          { date: "2026-09-02", startTime: "09:00", endTime: "10:30", roomId: "r-101" },
          teacherActor as any
        )
      ).rejects.toThrow("Room conflict detected");
    });

    it("should successfully reschedule class when no conflict exists", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      vi.spyOn(conflictService, "checkConflict").mockResolvedValueOnce({
        hasConflict: false,
        conflicts: [],
      });

      const updatedEntry = {
        ...sampleEntry,
        date: new Date("2026-09-02"),
        status: ScheduleEntryStatus.RESCHEDULED,
      };
      (prisma.scheduleEntry.update as any).mockResolvedValue(updatedEntry);

      const result = await scheduleService.rescheduleClass(
        "entry-1",
        { date: "2026-09-02", startTime: "11:00", endTime: "12:30" },
        teacherActor as any
      );

      expect(prisma.scheduleEntry.update).toHaveBeenCalled();
      expect(prisma.notification.createMany).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(result.status).toBe(ScheduleEntryStatus.RESCHEDULED);
    });
  });

  describe("cancelClass", () => {
    it("should reject cancellation if actor is not the teacher or admin", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);

      await expect(
        scheduleService.cancelClass("entry-1", { reason: "Sick leave" }, studentActor as any)
      ).rejects.toThrow("do not have permission");
    });

    it("should cancel class and notify batch students", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.scheduleEntry.update as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.CANCELLED,
      });

      const result = await scheduleService.cancelClass(
        "entry-1",
        { reason: "Personal emergency" },
        teacherActor as any
      );

      expect(prisma.scheduleEntry.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "entry-1" },
          data: { status: ScheduleEntryStatus.CANCELLED },
        })
      );
      expect(prisma.notification.createMany).toHaveBeenCalled();
      expect(result.status).toBe(ScheduleEntryStatus.CANCELLED);
    });
  });

  describe("getRoomAvailability", () => {
    it("should return availability matrix for rooms", async () => {
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        {
          id: "e-1",
          roomId: "r-101",
          date: new Date("2026-09-01"),
          startTime: "08:30",
          endTime: "10:00",
          course: { name: "SE", code: "CSE 404" },
          teacher: { name: "Dr. Anup" },
        },
      ]);

      const matrix = await scheduleService.getRoomAvailability("2026-09-01");
      expect(matrix).toHaveLength(2);
      const r101 = matrix.find((m) => m.room.id === "r-101");
      expect(r101).toBeDefined();
      expect(r101?.slots[0].isAvailable).toBe(false); // 08:30-10:00 is booked
      expect(r101?.slots[1].isAvailable).toBe(true); // 10:00-11:30 is free
    });
  });

  describe("createSeminarEntry", () => {
    const chairmanActor = {
      id: "chairman-1",
      email: "chairman@juniv.edu",
      role: Role.TEACHER,
      isChairman: true,
      teacherUniqueId: "T-CHAIR",
    };

    const adminActor = {
      id: "admin-1",
      email: "admin@juniv.edu",
      role: Role.ADMIN,
    };

    const regularTeacherActor = {
      id: "teacher-1",
      email: "teacher1@juniv.edu",
      role: Role.TEACHER,
      isChairman: false,
    };

    it("should reject non-chairman teacher from creating seminar", async () => {
      await expect(
        scheduleService.createSeminarEntry(
          {
            title: "Quantum Computing Seminar",
            date: "2026-09-03",
            startTime: "10:00",
            endTime: "11:30",
            roomId: "r-202",
            teacherId: "teacher-1",
            batchId: "batch-52",
          },
          regularTeacherActor as any
        )
      ).rejects.toThrow("Only the Chairman or Admin can create seminars");
    });

    it("should block seminar creation if conflictService detects a clash", async () => {
      vi.spyOn(conflictService, "checkConflict").mockResolvedValueOnce({
        hasConflict: true,
        conflicts: [
          {
            type: "ROOM",
            message: "Room R-202 is already occupied",
            conflictingEntry: {} as any,
          },
        ],
        summaryMessage: "Room conflict detected",
      });

      await expect(
        scheduleService.createSeminarEntry(
          {
            title: "Quantum Computing Seminar",
            date: "2026-09-03",
            startTime: "10:00",
            endTime: "11:30",
            roomId: "r-202",
            teacherId: "chairman-1",
            batchId: "batch-52",
          },
          chairmanActor as any
        )
      ).rejects.toThrow("Room conflict detected");
    });

    it("should successfully create seminar entry, log audit, and notify students", async () => {
      vi.spyOn(conflictService, "checkConflict").mockResolvedValueOnce({
        hasConflict: false,
        conflicts: [],
      });

      const createdSeminar = {
        id: "seminar-1",
        type: "SEMINAR",
        topic: "Quantum Computing Seminar",
        date: new Date("2026-09-03"),
        startTime: new Date("2026-09-03T10:00:00Z"),
        endTime: new Date("2026-09-03T11:30:00Z"),
        roomId: "r-202",
        teacherId: "chairman-1",
        batchId: "batch-52",
        status: ScheduleEntryStatus.SCHEDULED,
        room: { roomNumber: "R-202" },
      };

      (prisma.scheduleEntry.create as any).mockResolvedValue(createdSeminar);

      const result = await scheduleService.createSeminarEntry(
        {
          title: "Quantum Computing Seminar",
          date: "2026-09-03",
          startTime: "10:00",
          endTime: "11:30",
          roomId: "r-202",
          teacherId: "chairman-1",
          batchId: "batch-52",
        },
        chairmanActor as any
      );

      expect(prisma.scheduleEntry.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "CREATE_SEMINAR",
            entityType: "ScheduleEntry",
          }),
        })
      );
      expect(prisma.notification.createMany).toHaveBeenCalled();
      expect(result.type).toBe("SEMINAR");
    });
  });
});
