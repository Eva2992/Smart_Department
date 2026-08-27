import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    batch: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    semester: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    course: {
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("Semester Integration Routes (/api/v1/admin/semesters & /api/v1/semesters)", () => {
  const adminToken = generateAccessToken({
    userId: "admin-uuid-1",
    email: "admin@juniv.edu",
    role: "ADMIN",
    name: "Admin User",
  });

  const studentToken = generateAccessToken({
    userId: "student-uuid-1",
    email: "student@juniv.edu",
    role: "STUDENT",
    name: "Student User",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/admin/semesters", () => {
    it("returns 401 Unauthorized if no token provided", async () => {
      const res = await request(app).post("/api/v1/admin/semesters").send({
        name: "3rd Year 1st Semester",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 403 Forbidden if non-admin attempts to create semester", async () => {
      const res = await request(app)
        .post("/api/v1/admin/semesters")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          name: "3rd Year 1st Semester",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 400 when validation fails (invalid UUIDs or empty fields)", async () => {
      const res = await request(app)
        .post("/api/v1/admin/semesters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "",
          batchId: "invalid-uuid",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 201 Created with created semester and courses when admin submits valid payload", async () => {
      const batchId = "11111111-1111-1111-1111-111111111111";
      const teacherId = "22222222-2222-2222-2222-222222222222";

      vi.mocked(prisma.batch.findUnique).mockResolvedValue({
        id: batchId,
        name: "52nd",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: teacherId, role: "TEACHER", name: "Dr. Teacher" },
      ] as any);

      vi.mocked(prisma.semester.findFirst).mockResolvedValue(null);

      const createdSemester = {
        id: "33333333-3333-3333-3333-333333333333",
        name: "3rd Year 1st Semester",
        batchId,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        status: "ACTIVE",
        courses: [
          {
            id: "course-1",
            name: "Database Systems",
            code: "CSE 301",
            creditHours: 3.0,
            teacherId,
          },
        ],
      };

      vi.mocked(prisma.semester.create).mockResolvedValue(createdSemester as any);
      vi.mocked(prisma.batch.update).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/v1/admin/semesters")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "3rd Year 1st Semester",
          batchId,
          startDate: "2026-01-01",
          endDate: "2026-06-30",
          courses: [
            {
              name: "Database Systems",
              code: "CSE 301",
              creditHours: 3.0,
              teacherId,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("33333333-3333-3333-3333-333333333333");
      expect(res.body.data.name).toBe("3rd Year 1st Semester");
    });
  });

  describe("GET /api/v1/semesters", () => {
    it("returns list of semesters for authenticated users", async () => {
      vi.mocked(prisma.semester.findMany).mockResolvedValue([
        {
          id: "sem-1",
          name: "3rd Year 1st Semester",
          courses: [],
          batch: { id: "batch-1", name: "52nd" },
          _count: { courses: 4, results: 0 },
        },
      ] as any);

      const res = await request(app)
        .get("/api/v1/semesters")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });
});
