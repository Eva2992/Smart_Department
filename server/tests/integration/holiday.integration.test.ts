import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
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
      count: vi.fn(),
    },
    scheduleEntry: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  },
}));

describe("Holiday API Integration Tests", () => {
  const adminHeaders = {
    "x-user-id": "admin-1",
    "x-user-role": Role.ADMIN,
    "x-user-email": "admin@juniv.edu",
  };

  const studentHeaders = {
    "x-user-id": "student-1",
    "x-user-role": Role.STUDENT,
    "x-user-email": "student@juniv.edu",
    "x-user-batch-id": "batch-52",
  };

  const teacherHeaders = {
    "x-user-id": "teacher-1",
    "x-user-role": Role.TEACHER,
    "x-user-email": "teacher@juniv.edu",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/holidays", () => {
    it("should allow admin to declare a department-wide holiday and auto-cancel overlapping classes", async () => {
      const mockCreated = {
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "Independence Day",
        scope: HolidayScope.ALL,
        batchId: null,
      };

      (prisma.holiday.create as any).mockResolvedValue(mockCreated);
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        { id: "entry-1", batchId: "b-1" },
        { id: "entry-2", batchId: "b-2" },
      ]);
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post("/api/v1/holidays")
        .set(adminHeaders)
        .send({
          date: "2026-09-15",
          reason: "Independence Day",
          scope: "ALL",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affectedClassesCount).toBe(2);
      expect(res.body.data.holiday.reason).toBe("Independence Day");
      expect(prisma.scheduleEntry.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: { in: [ScheduleEntryStatus.SCHEDULED, ScheduleEntryStatus.RESCHEDULED] },
        }),
        data: { status: ScheduleEntryStatus.HOLIDAY },
      });
    });

    it("should allow admin to declare a batch-specific holiday", async () => {
      const mockCreated = {
        id: "hol-2",
        date: new Date("2026-09-20"),
        reason: "52nd Batch Study Break",
        scope: HolidayScope.BATCH,
        batchId: "batch-52",
      };

      (prisma.holiday.create as any).mockResolvedValue(mockCreated);
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        { id: "entry-1", batchId: "batch-52" },
      ]);
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post("/api/v1/holidays")
        .set(adminHeaders)
        .send({
          date: "2026-09-20",
          reason: "52nd Batch Study Break",
          scope: "BATCH",
          batchId: "batch-52",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.holiday.scope).toBe(HolidayScope.BATCH);
    });

    it("should reject holiday declaration with BATCH scope if batchId is omitted", async () => {
      const res = await request(app)
        .post("/api/v1/holidays")
        .set(adminHeaders)
        .send({
          date: "2026-09-20",
          reason: "Invalid Batch Holiday",
          scope: "BATCH",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject non-admin from declaring holiday with 403 Forbidden", async () => {
      const res = await request(app)
        .post("/api/v1/holidays")
        .set(studentHeaders)
        .send({
          date: "2026-09-15",
          reason: "Student Day Off",
        });

      expect(res.status).toBe(403);
    });

    it("should reject unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app)
        .post("/api/v1/holidays")
        .send({
          date: "2026-09-15",
          reason: "Unauthorized Request",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /api/v1/holidays/:id", () => {
    it("should allow admin to delete holiday and restore classes back to SCHEDULED status", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue({
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "Independence Day",
        scope: HolidayScope.ALL,
        batchId: null,
      });
      (prisma.holiday.delete as any).mockResolvedValue({ id: "hol-1" });
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 2 });

      const res = await request(app)
        .delete("/api/v1/holidays/hol-1")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.restoredClassesCount).toBe(2);
      expect(prisma.holiday.delete).toHaveBeenCalledWith({ where: { id: "hol-1" } });
      expect(prisma.scheduleEntry.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: ScheduleEntryStatus.HOLIDAY }),
        data: { status: ScheduleEntryStatus.SCHEDULED },
      });
    });

    it("should return 404 when attempting to delete non-existent holiday", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/v1/holidays/non-existent-id")
        .set(adminHeaders);

      expect(res.status).toBe(404);
    });

    it("should reject non-admin from deleting holiday", async () => {
      const res = await request(app)
        .delete("/api/v1/holidays/hol-1")
        .set(teacherHeaders);

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/v1/holidays", () => {
    it("should list holidays with date range and batch filters", async () => {
      const mockHolidays = [
        { id: "hol-1", date: new Date("2026-09-15"), reason: "Independence Day", scope: "ALL" },
      ];
      (prisma.holiday.findMany as any).mockResolvedValue(mockHolidays);

      const res = await request(app)
        .get("/api/v1/holidays")
        .query({ startDate: "2026-09-01", endDate: "2026-09-30", batchId: "batch-52" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(expect.any(Array));
    });
  });

  describe("GET /api/v1/holidays/upcoming", () => {
    it("should return upcoming holidays list", async () => {
      const mockUpcoming = [
        { id: "hol-1", date: new Date("2026-09-15"), reason: "Independence Day", scope: "ALL" },
      ];
      (prisma.holiday.findMany as any).mockResolvedValue(mockUpcoming);

      const res = await request(app)
        .get("/api/v1/holidays/upcoming")
        .query({ limit: 3 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/holidays/check", () => {
    it("should check if a date is a holiday", async () => {
      (prisma.holiday.count as any).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/holidays/check")
        .query({ date: "2026-09-15" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isHoliday).toBe(true);
    });

    it("should return 400 if date query parameter is missing", async () => {
      const res = await request(app).get("/api/v1/holidays/check");

      expect(res.status).toBe(400);
    });
  });
});
