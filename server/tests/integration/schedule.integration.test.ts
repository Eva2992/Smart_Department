import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { Role, ScheduleEntryStatus } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    scheduleEntry: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    user: {
      findMany: vi.fn().mockResolvedValue([{ id: "student-1" }]),
    },
    holiday: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    room: {
      findMany: vi.fn().mockResolvedValue([
        { id: "r-101", roomNumber: "R-101", type: "CLASSROOM", description: "Standard" },
        { id: "r-102", roomNumber: "R-102", type: "CLASSROOM", description: "Standard" },
      ]),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
  },
}));

describe("Schedule & Holiday API Integration Tests", () => {
  const teacherHeaders = {
    "x-user-id": "teacher-1",
    "x-user-role": Role.TEACHER,
    "x-user-teacher-id": "T-001",
  };

  const otherTeacherHeaders = {
    "x-user-id": "teacher-2",
    "x-user-role": Role.TEACHER,
    "x-user-teacher-id": "T-002",
  };

  const chairmanHeaders = {
    "x-user-id": "teacher-chair",
    "x-user-role": Role.TEACHER,
    "x-user-teacher-id": "T-CHAIR",
    "x-user-is-chairman": "true",
  };

  const adminHeaders = {
    "x-user-id": "admin-1",
    "x-user-role": Role.ADMIN,
  };

  const studentHeaders = {
    "x-user-id": "student-1",
    "x-user-role": Role.STUDENT,
    "x-user-batch-id": "batch-52",
  };

  const sampleEntry = {
    id: "entry-101",
    date: new Date("2026-09-01"),
    startTime: new Date("2026-09-01T09:00:00Z"),
    endTime: new Date("2026-09-01T10:30:00Z"),
    roomId: "r-101",
    teacherId: "teacher-1",
    batchId: "batch-52",
    status: ScheduleEntryStatus.SCHEDULED,
    type: "CLASS",
    course: { id: "c-1", name: "Software Engineering", code: "CSE 404" },
    teacher: { id: "teacher-1", name: "Dr. Anup", teacherUniqueId: "T-001" },
    room: { id: "r-101", roomNumber: "R-101" },
    batch: { id: "batch-52", name: "52nd Batch" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/schedules/check-conflict", () => {
    it("should return hasConflict: false when no overlapping events exist", async () => {
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);

      const res = await request(app).post("/api/v1/schedules/check-conflict").send({
        date: "2026-09-01",
        startTime: "09:00",
        endTime: "10:30",
        roomId: "r-101",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.hasConflict).toBe(false);
    });

    it("should return hasConflict: true with conflict details when a clash exists", async () => {
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([sampleEntry]);

      const res = await request(app).post("/api/v1/schedules/check-conflict").send({
        date: "2026-09-01",
        startTime: "09:15",
        endTime: "10:00",
        roomId: "r-101",
      });

      expect(res.status).toBe(200);
      expect(res.body.data.hasConflict).toBe(true);
      expect(res.body.data.conflicts[0].type).toBe("ROOM");
      expect(res.body.data.conflicts[0].message).toContain("Room R-101 is already occupied");
    });
  });

  describe("GET /api/v1/rooms/availability", () => {
    it("should return room availability matrix", async () => {
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);

      const res = await request(app).get("/api/v1/rooms/availability?date=2026-09-01");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/rooms/schedule", () => {
    it("should return multi-day room schedule grid", async () => {
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);

      const res = await request(app).get(
        "/api/v1/rooms/schedule?startDate=2026-09-01&endDate=2026-09-03"
      );

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rooms).toBeDefined();
      expect(res.body.data.dates).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
      expect(res.body.data.grid).toBeDefined();
    });
  });

  describe("POST /api/v1/schedules/seminar", () => {
    it("should reject unauthenticated request with 401", async () => {
      const res = await request(app).post("/api/v1/schedules/seminar").send({
        title: "AI Workshop",
        date: "2026-09-05",
        startTime: "10:00",
        endTime: "11:30",
        roomId: "r-202",
        teacherId: "teacher-1",
        batchId: "batch-52",
      });

      expect(res.status).toBe(401);
    });

    it("should reject student request with 403", async () => {
      const res = await request(app)
        .post("/api/v1/schedules/seminar")
        .set(studentHeaders)
        .send({
          title: "AI Workshop",
          date: "2026-09-05",
          startTime: "10:00",
          endTime: "11:30",
          roomId: "r-202",
          teacherId: "student-1",
          batchId: "batch-52",
        });

      expect(res.status).toBe(403);
    });

    it("should reject non-chairman teacher request with 403", async () => {
      const res = await request(app)
        .post("/api/v1/schedules/seminar")
        .set(teacherHeaders)
        .send({
          title: "AI Workshop",
          date: "2026-09-05",
          startTime: "10:00",
          endTime: "11:30",
          roomId: "r-202",
          teacherId: "teacher-1",
          batchId: "batch-52",
        });

      expect(res.status).toBe(403);
    });

    it("should allow chairman to schedule seminar when no conflicts exist", async () => {
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);
      (prisma.scheduleEntry.create as any).mockResolvedValue({
        id: "seminar-1",
        type: "SEMINAR",
        topic: "AI Workshop",
        date: new Date("2026-09-05"),
        startTime: new Date("2026-09-05T10:00:00Z"),
        endTime: new Date("2026-09-05T11:30:00Z"),
        roomId: "r-202",
        teacherId: "teacher-chair",
        batchId: "batch-52",
        status: "SCHEDULED",
        room: { id: "r-202", roomNumber: "R-202" },
      });

      const res = await request(app)
        .post("/api/v1/schedules/seminar")
        .set(chairmanHeaders)
        .send({
          title: "AI Workshop",
          date: "2026-09-05",
          startTime: "10:00",
          endTime: "11:30",
          roomId: "r-202",
          teacherId: "teacher-chair",
          batchId: "batch-52",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe("SEMINAR");
    });
  });

  describe("PATCH /api/v1/schedules/:id/reschedule", () => {
    it("should reject unauthenticated request with 401", async () => {
      const res = await request(app).patch("/api/v1/schedules/entry-101/reschedule").send({
        date: "2026-09-02",
        startTime: "09:00",
        endTime: "10:30",
      });

      expect(res.status).toBe(401);
    });

    it("should reject student attempt to reschedule with 403", async () => {
      const res = await request(app)
        .patch("/api/v1/schedules/entry-101/reschedule")
        .set(studentHeaders)
        .send({
          date: "2026-09-02",
          startTime: "09:00",
          endTime: "10:30",
        });

      expect(res.status).toBe(403);
    });

    it("should reject unauthorized teacher modifying someone else's class with 403", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);

      const res = await request(app)
        .patch("/api/v1/schedules/entry-101/reschedule")
        .set(otherTeacherHeaders)
        .send({
          date: "2026-09-02",
          startTime: "09:00",
          endTime: "10:30",
        });

      expect(res.status).toBe(403);
    });

    it("should return 409 Conflict if proposed slot overlaps with another booking", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      // Mock existing clash in database
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        {
          id: "entry-clash",
          date: new Date("2026-09-02"),
          startTime: "10:00",
          endTime: "11:30",
          roomId: "r-101",
          teacherId: "teacher-9",
          batchId: "batch-9",
          status: "SCHEDULED",
          course: { name: "OS", code: "CSE 303" },
          room: { roomNumber: "R-101" },
          teacher: { name: "Dr. Tariq" },
        },
      ]);

      const res = await request(app)
        .patch("/api/v1/schedules/entry-101/reschedule")
        .set(teacherHeaders)
        .send({
          date: "2026-09-02",
          startTime: "10:30",
          endTime: "12:00",
          roomId: "r-101",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CONFLICT_DETECTED");
    });

    it("should successfully reschedule class when no conflicts exist", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);
      (prisma.scheduleEntry.update as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.RESCHEDULED,
      });

      const res = await request(app)
        .patch("/api/v1/schedules/entry-101/reschedule")
        .set(teacherHeaders)
        .send({
          date: "2026-09-02",
          startTime: "11:00",
          endTime: "12:30",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ScheduleEntryStatus.RESCHEDULED);
    });
  });

  describe("PATCH /api/v1/schedules/:id/cancel", () => {
    it("should allow teacher to cancel their class and free slot", async () => {
      (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
      (prisma.scheduleEntry.update as any).mockResolvedValue({
        ...sampleEntry,
        status: ScheduleEntryStatus.CANCELLED,
      });

      const res = await request(app)
        .patch("/api/v1/schedules/entry-101/cancel")
        .set(teacherHeaders)
        .send({ reason: "Teacher illness" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(ScheduleEntryStatus.CANCELLED);
    });
  });

  describe("Holidays Management", () => {
    it("should allow Admin to declare a holiday and return 201 Created", async () => {
      (prisma.holiday.create as any).mockResolvedValue({
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "University Foundation Day",
        scope: "ALL",
      });
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([sampleEntry]);
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app).post("/api/v1/holidays").set(adminHeaders).send({
        date: "2026-09-15",
        reason: "University Foundation Day",
        scope: "ALL",
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.affectedClassesCount).toBe(1);
    });

    it("should reject non-admin from declaring holiday with 403", async () => {
      const res = await request(app).post("/api/v1/holidays").set(teacherHeaders).send({
        date: "2026-09-15",
        reason: "Teacher Day Off",
      });

      expect(res.status).toBe(403);
    });

    it("should allow Admin to delete a holiday and restore classes", async () => {
      (prisma.holiday.findUnique as any).mockResolvedValue({
        id: "hol-1",
        date: new Date("2026-09-15"),
        reason: "Foundation Day",
        scope: "ALL",
      });
      (prisma.holiday.delete as any).mockResolvedValue({ id: "hol-1" });
      (prisma.scheduleEntry.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app).delete("/api/v1/holidays/hol-1").set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.restoredClassesCount).toBe(1);
    });
  });
});
