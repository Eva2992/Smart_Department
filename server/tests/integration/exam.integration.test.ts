/**
 * Integration tests for Exam Routine API routes
 * Tests: POST /api/v1/exams/routine, GET, PATCH, DELETE
 * FR-22: Semester Final Exam Routine Generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { ScheduleEntryType, ScheduleEntryStatus, Role } from "@prisma/client";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    scheduleEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    batch: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/services/conflictService.js", () => ({
  conflictService: {
    checkConflict: vi.fn(),
  },
}));

import { conflictService } from "../../src/services/conflictService.js";

// ── Tokens ────────────────────────────────────────────────────────────────────

const adminToken = generateAccessToken({
  userId: "admin-uuid-001",
  role: Role.ADMIN,
  name: "Admin User",
  email: "admin@juniv.edu",
});

const studentToken = generateAccessToken({
  userId: "student-uuid-001",
  role: Role.STUDENT,
  name: "Student User",
  email: "student@juniv.edu",
  batchId: "batch-uuid-001",
});

const teacherToken = generateAccessToken({
  userId: "teacher-uuid-001",
  role: Role.TEACHER,
  name: "Teacher User",
  email: "teacher@juniv.edu",
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const rawExamEntry = {
  id: "exam-uuid-001",
  type: ScheduleEntryType.EXAM,
  status: ScheduleEntryStatus.SCHEDULED,
  courseId: null,
  course: null,
  batchId: "batch-uuid-001",
  batch: { name: "52nd" },
  teacherId: "teacher-uuid-001",
  teacher: { name: "Dr. Islam" },
  roomId: "room-uuid-r202",
  room: { roomNumber: "R-202" },
  date: new Date("2026-12-15"),
  startTime: new Date("2026-12-15T09:00:00.000Z"),
  endTime: new Date("2026-12-15T12:00:00.000Z"),
  topic: "Data Structures",
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Exam Routine Routes (/api/v1/exams)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── POST /api/v1/exams/routine ─────────────────────────────────────────────

  describe("POST /api/v1/exams/routine", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app)
        .post("/api/v1/exams/routine")
        .send({ entries: [] });

      expect(res.status).toBe(401);
    });

    it("returns 403 when role is STUDENT", async () => {
      const res = await request(app)
        .post("/api/v1/exams/routine")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ entries: [] });

      expect(res.status).toBe(403);
    });

    it("returns 403 when role is TEACHER", async () => {
      const res = await request(app)
        .post("/api/v1/exams/routine")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ entries: [] });

      expect(res.status).toBe(403);
    });

    it("creates exam entries when Admin provides valid payload", async () => {
      vi.mocked(conflictService.checkConflict).mockResolvedValue({
        hasConflict: false,
        conflicts: [],
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        vi.mocked(prisma.scheduleEntry.create).mockResolvedValue(rawExamEntry as any);
        return fn(prisma as any);
      });

      const res = await request(app)
        .post("/api/v1/exams/routine")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          entries: [
            {
              batchId: "batch-uuid-001",
              courseName: "Data Structures",
              roomId: "room-uuid-r202",
              teacherId: "teacher-uuid-001",
              date: "2026-12-15",
              startTime: "09:00",
              endTime: "12:00",
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].type).toBe("EXAM");
    });

    it("returns 409 on conflict", async () => {
      vi.mocked(conflictService.checkConflict).mockResolvedValue({
        hasConflict: true,
        conflicts: [
          {
            type: "ROOM",
            message: "Room R-202 is already occupied",
            conflictingEntry: {} as any,
          },
        ],
        summaryMessage: "Room R-202 is already occupied",
      });

      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
        return fn(prisma as any);
      });

      const res = await request(app)
        .post("/api/v1/exams/routine")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          entries: [
            {
              batchId: "batch-uuid-001",
              courseName: "Algorithms",
              roomId: "room-uuid-r202",
              date: "2026-12-15",
              startTime: "09:00",
              endTime: "12:00",
            },
          ],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("EXAM_CONFLICT");
    });

    it("returns 400 on schema validation error (missing required fields)", async () => {
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as any));

      const res = await request(app)
        .post("/api/v1/exams/routine")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          entries: [
            {
              // Missing: batchId, roomId, date, startTime, endTime
              courseName: "Algorithms",
            },
          ],
        });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/v1/exams/routine ──────────────────────────────────────────────

  describe("GET /api/v1/exams/routine", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/v1/exams/routine");
      expect(res.status).toBe(401);
    });

    it("returns exam schedule for authenticated Student", async () => {
      vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([rawExamEntry as any]);
      vi.mocked(prisma.scheduleEntry.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/exams/routine?batchId=batch-uuid-001")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.exams).toHaveLength(1);
      expect(res.body.data.exams[0].batchId).toBe("batch-uuid-001");
    });

    it("returns exam schedule for authenticated Teacher", async () => {
      vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([rawExamEntry as any]);
      vi.mocked(prisma.scheduleEntry.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/exams/routine")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  // ── GET /api/v1/exams/routine/:id ─────────────────────────────────────────

  describe("GET /api/v1/exams/routine/:id", () => {
    it("returns single exam entry by ID", async () => {
      vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);

      const res = await request(app)
        .get("/api/v1/exams/routine/exam-uuid-001")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("exam-uuid-001");
    });

    it("returns 404 for unknown exam ID", async () => {
      vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get("/api/v1/exams/routine/nonexistent-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("EXAM_NOT_FOUND");
    });
  });

  // ── PATCH /api/v1/exams/routine/:id ───────────────────────────────────────

  describe("PATCH /api/v1/exams/routine/:id", () => {
    it("returns 403 when Student tries to update exam", async () => {
      const res = await request(app)
        .patch("/api/v1/exams/routine/exam-uuid-001")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ courseName: "New Course" });

      expect(res.status).toBe(403);
    });

    it("updates exam entry as Admin", async () => {
      vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);
      vi.mocked(conflictService.checkConflict).mockResolvedValue({
        hasConflict: false,
        conflicts: [],
      });
      vi.mocked(prisma.scheduleEntry.update).mockResolvedValue({
        ...rawExamEntry,
        topic: "Operating Systems",
      } as any);

      const res = await request(app)
        .patch("/api/v1/exams/routine/exam-uuid-001")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ courseName: "Operating Systems" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── DELETE /api/v1/exams/routine/:id ──────────────────────────────────────

  describe("DELETE /api/v1/exams/routine/:id", () => {
    it("returns 403 when Teacher tries to cancel exam", async () => {
      const res = await request(app)
        .delete("/api/v1/exams/routine/exam-uuid-001")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(403);
    });

    it("cancels exam entry as Admin (sets status to CANCELLED)", async () => {
      vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);
      vi.mocked(prisma.scheduleEntry.update).mockResolvedValue({
        ...rawExamEntry,
        status: ScheduleEntryStatus.CANCELLED,
      } as any);

      const res = await request(app)
        .delete("/api/v1/exams/routine/exam-uuid-001")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("CANCELLED");
    });
  });
});
