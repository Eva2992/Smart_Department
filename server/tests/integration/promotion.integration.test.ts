import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    batch: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    semester: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    promotionRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    scheduleEntry: {
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("Promotion Integration Routes (/api/v1/promotions & /api/v1/admin/batches/:id/promote)", () => {
  const batchId = "11111111-1111-1111-1111-111111111111";
  const semesterId = "22222222-2222-2222-2222-222222222222";

  const adminToken = generateAccessToken({
    userId: "admin-uuid-1",
    email: "admin@juniv.edu",
    role: "ADMIN",
    name: "Admin User",
  });

  const crToken = generateAccessToken({
    userId: "cr-uuid-1",
    email: "cr52@juniv.edu",
    role: "CR",
    name: "CR User",
    batchId,
  });

  const studentToken = generateAccessToken({
    userId: "student-uuid-1",
    email: "student@juniv.edu",
    role: "STUDENT",
    name: "Student User",
    batchId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/v1/promotions/request", () => {
    it("returns 403 Forbidden if a regular STUDENT attempts to submit promotion request", async () => {
      const res = await request(app)
        .post("/api/v1/promotions/request")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          batchId,
          semesterId,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("returns 201 Created when appointed CR submits promotion request within completion window", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue({
        id: batchId,
        name: "52nd",
        status: "ACTIVE",
        currentSemesterId: semesterId,
      } as any);

      vi.mocked(prisma.semester.findUnique).mockResolvedValue({
        id: semesterId,
        batchId,
        endDate: new Date(Date.now() + 2 * 24 * 3600 * 1000), // within 7 days
        status: "ACTIVE",
      } as any);

      vi.mocked(prisma.promotionRequest.findFirst).mockResolvedValue(null);

      vi.mocked(prisma.promotionRequest.create).mockResolvedValue({
        id: "req-123",
        batchId,
        semesterId,
        requestedById: "cr-uuid-1",
        status: "PENDING",
        reason: "Semester completed",
        createdAt: new Date(),
        batch: { id: batchId, name: "52nd", program: "HONOURS" },
        semester: { id: semesterId, name: "2-2" },
        requestedBy: { id: "cr-uuid-1", name: "CR User", email: "cr52@juniv.edu", role: "CR" },
      } as any);

      const res = await request(app)
        .post("/api/v1/promotions/request")
        .set("Authorization", `Bearer ${crToken}`)
        .send({
          batchId,
          semesterId,
          reason: "Semester completed",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("req-123");
    });
  });

  describe("POST /api/v1/admin/batches/:id/promote (Admin)", () => {
    it("returns 200 OK and executes promotion with CR reset", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue({
        id: batchId,
        name: "52nd",
        status: "ACTIVE",
        currentSemesterId: semesterId,
        currentSemester: { id: semesterId, name: "2nd Year 2nd Semester" },
      } as any);

      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "student-1", role: "STUDENT" },
        { id: "cr-1", role: "CR" },
      ] as any);

      vi.mocked(prisma.semester.create).mockResolvedValue({
        id: "33333333-3333-3333-3333-333333333333",
        name: "3rd Year 1st Semester",
      } as any);

      const res = await request(app)
        .post(`/api/v1/admin/batches/${batchId}/promote`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          nextSemesterName: "3rd Year 1st Semester",
          nextSemesterStartDate: "2026-07-01",
          nextSemesterEndDate: "2026-12-31",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.crRolesReset).toBe(true);
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { batchId, role: "CR" },
        data: { role: "STUDENT" },
      });
    });
  });
});
