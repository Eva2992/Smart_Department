import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("Student Admin Routes (/api/v1/admin/students & semester-override)", () => {
  const studentId = "44444444-4444-4444-4444-444444444444";
  const targetBatchId = "55555555-5555-5555-5555-555555555555";

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

  describe("GET /api/v1/admin/students", () => {
    it("returns 403 if accessed by student", async () => {
      const res = await request(app)
        .get("/api/v1/admin/students")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it("returns paginated student list for admin", async () => {
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        {
          id: studentId,
          name: "Tahmid Hasan",
          universityId: "2021-1-60-001",
          email: "student52_1@juniv.edu",
          role: "STUDENT",
          studentStatus: "ACTIVE",
          batchId: "batch-52",
          batch: { id: "batch-52", name: "52nd" },
        },
      ] as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/admin/students?q=Tahmid")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.students).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });
  });

  describe("PATCH /api/v1/admin/students/:id/semester-override (FR-09)", () => {
    it("updates student status and batch with audit trail creation", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: studentId,
        name: "Tahmid Hasan",
        universityId: "2021-1-60-001",
        email: "student52_1@juniv.edu",
        role: "STUDENT",
        studentStatus: "ACTIVE",
        batchId: "batch-52",
        batch: { id: "batch-52", name: "52nd" },
      } as any);

      vi.mocked(prisma.batch.findUnique).mockResolvedValue({
        id: targetBatchId,
        name: "53rd",
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.user.update).mockResolvedValue({
        id: studentId,
        name: "Tahmid Hasan",
        email: "student52_1@juniv.edu",
        universityId: "2021-1-60-001",
        role: "STUDENT",
        studentStatus: "DEMOTED",
        batchId: targetBatchId,
      } as any);

      const res = await request(app)
        .patch(`/api/v1/admin/students/${studentId}/semester-override`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          batchId: targetBatchId,
          studentStatus: "DEMOTED",
          reason: "Academic probation readmission",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.studentStatus).toBe("DEMOTED");
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: "STUDENT_SEMESTER_OVERRIDE",
            entityId: studentId,
          }),
        })
      );
    });
  });
});
