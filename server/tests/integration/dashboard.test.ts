import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    batch: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    scheduleEntry: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
    },
    cTMark: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    semester: {
      count: vi.fn(),
    },
    promotionRequest: {
      findMany: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("Dashboard API Integration (/api/v1/dashboard)", () => {
  const studentToken = generateAccessToken({
    userId: "student-1",
    email: "student@juniv.edu",
    role: "STUDENT",
    name: "Student User",
    batchId: "batch-1",
  });

  const teacherToken = generateAccessToken({
    userId: "teacher-1",
    email: "teacher@juniv.edu",
    role: "TEACHER",
    name: "Teacher User",
  });

  const adminToken = generateAccessToken({
    userId: "admin-1",
    email: "admin@juniv.edu",
    role: "ADMIN",
    name: "Admin User",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/dashboard/student", () => {
    it("should reject unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/v1/dashboard/student");
      expect(res.status).toBe(401);
    });

    it("should reject TEACHER role with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/student")
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    it("should return student dashboard data for STUDENT", async () => {
      (prisma.batch.findUnique as any).mockResolvedValue({
        id: "batch-1",
        name: "52nd",
        program: "HONOURS",
        currentSemesterId: "sem-1",
        currentSemester: { id: "sem-1", name: "4th Year 2nd Semester", courses: [] },
      });
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);
      (prisma.assignment.findMany as any).mockResolvedValue([]);
      (prisma.cTMark.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/dashboard/student")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batch.name).toBe("52nd");
      expect(res.body.data.todaySchedule).toEqual([]);
    });
  });

  describe("GET /api/v1/dashboard/teacher", () => {
    it("should reject STUDENT role with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/teacher")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it("should return teacher dashboard data for TEACHER", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "teacher-1",
        name: "Dr. Faculty",
        teacherUniqueId: "T-100",
      });
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);
      (prisma.course.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/dashboard/teacher")
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teacher.name).toBe("Dr. Faculty");
      expect(res.body.data.teacher.teacherUniqueId).toBe("T-100");
    });
  });

  describe("GET /api/v1/dashboard/admin", () => {
    it("should reject TEACHER role with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", `Bearer ${teacherToken}`);
      expect(res.status).toBe(403);
    });

    it("should return admin dashboard data for ADMIN", async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(31)
        .mockResolvedValueOnce(5);
      (prisma.batch.count as any).mockResolvedValue(6);
      (prisma.semester.count as any).mockResolvedValue(6);
      (prisma.scheduleEntry.count as any).mockResolvedValue(40);
      (prisma.promotionRequest.findMany as any).mockResolvedValue([]);
      (prisma.holiday.findMany as any).mockResolvedValue([]);
      (prisma.scheduleEntry.findMany as any).mockResolvedValue([]);
      (prisma.auditLog.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get("/api/v1/dashboard/admin")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.systemOverview.totalStudents).toBe(200);
      expect(res.body.data.systemOverview.totalTeachers).toBe(31);
    });
  });
});
