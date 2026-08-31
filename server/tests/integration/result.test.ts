import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { resultService } from "../../src/services/result.service.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { Role } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    result: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    resource: {
      create: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    semester: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb) => {
      if (typeof cb === "function") return cb(prisma);
      return Promise.all(cb);
    }),
  },
}));

describe("Result Integration Routes (/api/v1/results)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const crToken = generateAccessToken({
    userId: "cr-user-id",
    role: Role.CR,
    name: "CR Name",
    email: "cr@juniv.edu",
    batchId: "batch-52",
  });

  const studentToken = generateAccessToken({
    userId: "student-user-id",
    role: Role.STUDENT,
    name: "Student Name",
    email: "student@juniv.edu",
    batchId: "batch-52",
    universityId: "2020101",
  });

  const adminToken = generateAccessToken({
    userId: "admin-user-id",
    role: Role.ADMIN,
    name: "Admin User",
    email: "admin@juniv.edu",
    batchId: null,
  });

  describe("POST /api/v1/results/upload", () => {
    const validPayload = {
      batchId: "batch-52",
      semesterId: "sem-1",
      results: [
        {
          universityId: "2020101",
          studentName: "Rahim Ahmed",
          courseMarks: [
            {
              courseCode: "CSE 401",
              courseTitle: "Distributed Systems",
              creditHours: 3.0,
              marks: 85,
              letterGrade: "A+",
              gradePoint: 4.0,
            },
          ],
          gpa: 4.0,
          cgpa: 3.9,
        },
      ],
      rawContent: "University ID,Student Name,CSE 401\n2020101,Rahim Ahmed,85",
      fileName: "results_52_sem1.csv",
    };

    it("returns 401 Unauthorized when no auth token is provided", async () => {
      const res = await request(app).post("/api/v1/results/upload").send(validPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 Forbidden when regular student attempts to upload results", async () => {
      const res = await request(app)
        .post("/api/v1/results/upload")
        .set("Authorization", `Bearer ${studentToken}`)
        .send(validPayload);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns 400 Bad Request when payload fails validation", async () => {
      const res = await request(app)
        .post("/api/v1/results/upload")
        .set("Authorization", `Bearer ${crToken}`)
        .send({
          batchId: "batch-52",
          // missing semesterId and results
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 201 Created and publishes results when CR uploads for own batch", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue({
        id: "batch-52",
        name: "52nd Batch",
      } as any);
      vi.mocked(prisma.semester.findUnique).mockResolvedValue({
        id: "sem-1",
        name: "4th Year 1st Semester",
        batchId: "batch-52",
      } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "student-user-id", universityId: "2020101", name: "Rahim Ahmed" },
      ] as any);
      vi.mocked(prisma.result.upsert).mockResolvedValue({ id: "res-1" } as any);
      vi.mocked(prisma.resource.create).mockResolvedValue({ id: "resource-1" } as any);

      const res = await request(app)
        .post("/api/v1/results/upload")
        .set("Authorization", `Bearer ${crToken}`)
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.publishedCount).toBe(1);
      expect(res.body.data.resourceArchived).toBe(true);
    });

    it("allows ADMIN to publish results for any batch", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue({
        id: "batch-52",
        name: "52nd Batch",
      } as any);
      vi.mocked(prisma.semester.findUnique).mockResolvedValue({
        id: "sem-1",
        name: "4th Year 1st Semester",
        batchId: "batch-52",
      } as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.result.upsert).mockResolvedValue({ id: "res-1" } as any);

      const res = await request(app)
        .post("/api/v1/results/upload")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          batchId: "batch-52",
          semesterId: "sem-1",
          results: validPayload.results,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/results/query", () => {
    it("returns 200 and paginated results publicly", async () => {
      vi.mocked(prisma.result.findMany).mockResolvedValue([
        {
          id: "res-1",
          batchId: "batch-52",
          semesterId: "sem-1",
          universityId: "2020101",
          gpa: 3.95,
          cgpa: 3.9,
          courseMarks: [],
          publishedAt: new Date(),
          student: { id: "s1", name: "Rahim Ahmed", email: "rahim@juniv.edu" },
          batch: { id: "b1", name: "52nd", program: "HONOURS" },
          semester: { id: "sem-1", name: "4th Year 1st Semester" },
          uploadedBy: { id: "u1", name: "CR Name", role: Role.CR },
        },
      ] as any);
      vi.mocked(prisma.result.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/results/query")
        .query({ batchId: "batch-52", page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.results).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.results[0].universityId).toBe("2020101");
    });
  });

  describe("GET /api/v1/results/student/:id", () => {
    it("returns student semester results breakdown", async () => {
      vi.mocked(prisma.result.findMany).mockResolvedValue([
        {
          id: "res-1",
          universityId: "2020101",
          gpa: 3.95,
          courseMarks: [
            {
              courseCode: "CSE 401",
              courseTitle: "Distributed Systems",
              creditHours: 3.0,
              letterGrade: "A+",
              gradePoint: 4.0,
            },
          ],
          batch: { id: "b1", name: "52nd", program: "HONOURS" },
          semester: { id: "sem-1", name: "4th Year 1st Semester" },
          student: { id: "s1", name: "Rahim Ahmed", universityId: "2020101" },
        },
      ] as any);

      const res = await request(app).get("/api/v1/results/student/2020101");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].gpa).toBe(3.95);
    });
  });

  describe("GET /api/v1/results/me", () => {
    it("returns personal results for logged in student", async () => {
      vi.mocked(prisma.result.findMany).mockResolvedValue([
        {
          id: "res-1",
          universityId: "2020101",
          gpa: 3.95,
          courseMarks: [],
          batch: { name: "52nd" },
          semester: { name: "4th Year 1st Semester" },
        },
      ] as any);

      const res = await request(app)
        .get("/api/v1/results/me")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/results/batch/:batchId/semester/:semesterId", () => {
    it("returns summary analytics for a batch and semester", async () => {
      vi.mocked(prisma.result.findMany).mockResolvedValue([
        {
          id: "res-1",
          batchId: "batch-52",
          semesterId: "sem-1",
          universityId: "2020101",
          gpa: 4.0,
          student: { name: "Student 1", universityId: "2020101" },
        },
        {
          id: "res-2",
          batchId: "batch-52",
          semesterId: "sem-1",
          universityId: "2020102",
          gpa: 3.5,
          student: { name: "Student 2", universityId: "2020102" },
        },
      ] as any);

      const res = await request(app).get("/api/v1/results/batch/batch-52/semester/sem-1");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalStudents).toBe(2);
      expect(res.body.data.averageGpa).toBe(3.75);
      expect(res.body.data.highestGpa).toBe(4.0);
      expect(res.body.data.passRate).toBe(100);
    });
  });
});
