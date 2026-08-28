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
      delete: vi.fn(),
      findMany: vi.fn(),
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

    it("should declare a holiday and retroactively update overlapping classes to HOLIDAY status", async () => {
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

      expect(prisma.holiday.create).toHaveBeenCalled();
      expect(prisma.scheduleEntry.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: [ScheduleEntryStatus.SCHEDULED, ScheduleEntryStatus.RESCHEDULED] },
        }),
        data: { status: ScheduleEntryStatus.HOLIDAY },
      });
      expect(result.affectedClassesCount).toBe(2);
      expect(result.holiday.reason).toBe("Independence Day");
    });
  });

  describe("deleteHoliday", () => {
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
  });
});
