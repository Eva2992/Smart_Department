import { describe, it, expect, vi, beforeEach } from "vitest";
import { holidayService } from "../../src/services/holidayService.js";
import { prisma } from "../../src/lib/prisma.js";
import { Role, HolidayScope, ScheduleEntryStatus } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    holiday: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    scheduleEntry: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("holidayService", () => {
  const mockAdminActor = {
    id: "admin-1",
    email: "admin@juniv.edu",
    role: Role.ADMIN,
  };

  const mockTeacherActor = {
    id: "teacher-1",
    email: "teacher@juniv.edu",
    role: Role.TEACHER,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("declareHoliday", () => {
    it("should reject non-admin users from declaring holidays", async () => {
      await expect(
        holidayService.declareHoliday(
          { date: "2026-09-15", reason: "Department Day" },
          mockTeacherActor as any
        )
      ).rejects.toThrow("Only departmental administrators");
    });

    it("should reject BATCH scope if batchId is missing", async () => {
      await expect(
        holidayService.declareHoliday(
          { date: "2026-09-15", reason: "Batch Off-Day", scope: HolidayScope.BATCH },
          mockAdminActor as any
        )
      ).rejects.toThrow("batchId is required when holiday scope is BATCH");
    });

    it("should declare a department-wide holiday (ALL scope) and retroactively update overlapping classes to HOLIDAY status", async () => {
      const mockCreatedHoliday = {
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "Independence Day",
        scope: HolidayScope.ALL,
        batchId: null,
      };

      (prisma.holiday.create as any).mockResolvedValue(mockCreatedHoliday);
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        { id: "entry-1", batchId: "b-1" },
        { id: "entry-2", batchId: "b-2" },
      ]);
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 2 });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-1" });

      const result = await holidayService.declareHoliday(
        { date: "2026-09-15", reason: "Independence Day", scope: HolidayScope.ALL },
        mockAdminActor as any
      );

      expect(prisma.holiday.create).toHaveBeenCalledWith({
        data: {
          date: expect.any(Date),
          reason: "Independence Day",
          scope: HolidayScope.ALL,
          batchId: null,
        },
      });
      expect(prisma.scheduleEntry.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: [ScheduleEntryStatus.SCHEDULED, ScheduleEntryStatus.RESCHEDULED] },
        }),
        data: { status: ScheduleEntryStatus.HOLIDAY },
      });
      expect(result.affectedClassesCount).toBe(2);
      expect(result.holiday.reason).toBe("Independence Day");
    });

    it("should declare a batch-specific holiday (BATCH scope) and auto-cancel only classes for that batch", async () => {
      const mockCreatedHoliday = {
        id: "hol-2",
        date: new Date("2026-09-20"),
        reason: "52nd Batch Study Break",
        scope: HolidayScope.BATCH,
        batchId: "batch-52",
      };

      (prisma.holiday.create as any).mockResolvedValue(mockCreatedHoliday);
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        { id: "entry-1", batchId: "batch-52" },
      ]);
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-2" });

      const result = await holidayService.declareHoliday(
        {
          date: "2026-09-20",
          reason: "52nd Batch Study Break",
          scope: HolidayScope.BATCH,
          batchId: "batch-52",
        },
        mockAdminActor as any
      );

      expect(prisma.holiday.create).toHaveBeenCalledWith({
        data: {
          date: expect.any(Date),
          reason: "52nd Batch Study Break",
          scope: HolidayScope.BATCH,
          batchId: "batch-52",
        },
      });
      expect(prisma.scheduleEntry.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          batchId: "batch-52",
          status: { in: [ScheduleEntryStatus.SCHEDULED, ScheduleEntryStatus.RESCHEDULED] },
        }),
        include: { batch: true, course: true },
      });
      expect(result.affectedClassesCount).toBe(1);
    });
  });

  describe("deleteHoliday / removeHoliday", () => {
    it("should reject non-admin users from deleting holidays", async () => {
      await expect(
        holidayService.deleteHoliday("hol-1", mockTeacherActor as any)
      ).rejects.toThrow("Only departmental administrators");
    });

    it("should throw 404 when holiday does not exist", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue(null);

      await expect(
        holidayService.deleteHoliday("non-existent-id", mockAdminActor as any)
      ).rejects.toThrow("Holiday not found");
    });

    it("should delete holiday and restore classes back to SCHEDULED status", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue({
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "Independence Day",
        scope: HolidayScope.ALL,
        batchId: null,
      });
      (prisma.holiday.delete as any).mockResolvedValue({ id: "hol-1" });
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 2 });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-2" });

      const result = await holidayService.deleteHoliday("hol-1", mockAdminActor as any);

      expect(prisma.holiday.delete).toHaveBeenCalledWith({ where: { id: "hol-1" } });
      expect(prisma.scheduleEntry.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: ScheduleEntryStatus.HOLIDAY }),
        data: { status: ScheduleEntryStatus.SCHEDULED },
      });
      expect(result.restoredClassesCount).toBe(2);
    });

    it("should restore only batch-specific classes when deleting a BATCH-scoped holiday", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue({
        id: "hol-2",
        date: new Date("2026-09-20"),
        reason: "Batch Holiday",
        scope: HolidayScope.BATCH,
        batchId: "batch-52",
      });
      (prisma.holiday.delete as any).mockResolvedValue({ id: "hol-2" });
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 3 });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-3" });

      const result = await holidayService.removeHoliday("hol-2", mockAdminActor as any);

      expect(prisma.scheduleEntry.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: ScheduleEntryStatus.HOLIDAY,
          batchId: "batch-52",
        }),
        data: { status: ScheduleEntryStatus.SCHEDULED },
      });
      expect(result.restoredClassesCount).toBe(3);
    });
  });

  describe("getHolidays and getHolidaysByDateRange", () => {
    it("should return holidays filtered by date range and batchId", async () => {
      const mockHolidays = [
        { id: "hol-1", date: new Date("2026-09-15"), reason: "Day 1", scope: "ALL" },
        { id: "hol-2", date: new Date("2026-09-20"), reason: "Day 2", scope: "BATCH", batchId: "batch-52" },
      ];
      (prisma.holiday.findMany as any).mockResolvedValue(mockHolidays);

      const res = await holidayService.getHolidaysByDateRange("2026-09-01", "2026-09-30", "batch-52");

      expect(prisma.holiday.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          date: expect.any(Object),
          OR: [{ scope: HolidayScope.ALL }, { batchId: "batch-52" }],
        }),
        orderBy: { date: "asc" },
        include: { batch: { select: { id: true, name: true } } },
      });
      expect(res).toEqual(mockHolidays);
    });
  });

  describe("isHolidayDate", () => {
    it("should return true if department-wide holiday exists on the date", async () => {
      (prisma.holiday.count as any).mockResolvedValue(1);

      const isHoliday = await holidayService.isHolidayDate("2026-09-15");
      expect(isHoliday).toBe(true);
      expect(prisma.holiday.count).toHaveBeenCalledWith({
        where: {
          date: expect.any(Date),
          scope: HolidayScope.ALL,
        },
      });
    });

    it("should return true if batch-specific holiday exists for the given batch", async () => {
      (prisma.holiday.count as any).mockResolvedValue(1);

      const isHoliday = await holidayService.isHolidayDate("2026-09-20", "batch-52");
      expect(isHoliday).toBe(true);
      expect(prisma.holiday.count).toHaveBeenCalledWith({
        where: {
          date: expect.any(Date),
          OR: [{ scope: HolidayScope.ALL }, { batchId: "batch-52" }],
        },
      });
    });

    it("should return false if no holiday exists on that date", async () => {
      (prisma.holiday.count as any).mockResolvedValue(0);

      const isHoliday = await holidayService.isHolidayDate("2026-10-01");
      expect(isHoliday).toBe(false);
    });
  });

  describe("getUpcomingHolidays", () => {
    it("should fetch upcoming holidays from today onwards with default limit", async () => {
      const mockUpcoming = [
        { id: "hol-1", date: new Date("2026-09-15"), reason: "Foundation Day" },
      ];
      (prisma.holiday.findMany as any).mockResolvedValue(mockUpcoming);

      const res = await holidayService.getUpcomingHolidays(5);
      expect(prisma.holiday.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          date: expect.any(Object),
        }),
        orderBy: { date: "asc" },
        take: 5,
        include: { batch: { select: { id: true, name: true } } },
      });
      expect(res).toEqual(mockUpcoming);
    });
  });

  describe("updateHoliday", () => {
    it("should allow admin to update a holiday", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue({
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "Old Reason",
        scope: HolidayScope.ALL,
        batchId: null,
      });
      (prisma.holiday.update as any).mockResolvedValue({
        id: "hol-1",
        date: new Date("2026-09-16"),
        reason: "New Reason",
        scope: HolidayScope.ALL,
        batchId: null,
      });
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-upd" });

      const res = await holidayService.updateHoliday(
        "hol-1",
        { reason: "New Reason", date: "2026-09-16" },
        mockAdminActor as any
      );

      expect(res.holiday.reason).toBe("New Reason");
      expect(prisma.holiday.update).toHaveBeenCalled();
    });

    it("should allow CR to declare batch off-day", async () => {
      const mockCrActor = { id: "cr-1", role: Role.CR, batchId: "batch-52" };
      (prisma.holiday.create as any).mockResolvedValue({
        id: "hol-cr",
        date: new Date("2026-09-20"),
        reason: "Batch Study Leave",
        scope: HolidayScope.BATCH,
        batchId: "batch-52",
      });
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);
      (prisma.auditLog.create as any).mockResolvedValue({ id: "audit-cr" });

      const res = await holidayService.declareHoliday(
        { date: "2026-09-20", reason: "Batch Study Leave" },
        mockCrActor as any
      );

      expect(res.holiday.scope).toBe(HolidayScope.BATCH);
      expect(res.holiday.batchId).toBe("batch-52");
    });
  });
});

