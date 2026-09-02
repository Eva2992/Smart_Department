import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { Role } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((cb) => cb(prisma)),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    preloadedStudent: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    preloadedTeacher: {
      findMany: vi.fn(),
      count: vi.fn(),
      upsert: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Admin Gaps Integration Tests (Preloaded Rosters, CR Role, Audit Logs)", () => {
  const adminToken = generateAccessToken({
    userId: "admin-1",
    email: "admin@juniv.edu",
    role: "ADMIN",
    name: "Admin User",
  });

  const studentToken = generateAccessToken({
    userId: "student-1",
    email: "student@juniv.edu",
    role: "STUDENT",
    name: "Student User",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Preloaded Students & Teachers API", () => {
    it("rejects unauthorized access from non-admin", async () => {
      const res = await request(app)
        .get("/api/v1/admin/preloaded-students")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it("bulk imports preloaded students", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue({ id: "batch-1", name: "51st" } as any);
      vi.mocked(prisma.preloadedStudent.upsert).mockResolvedValue({} as any);

      const res = await request(app)
        .post("/api/v1/admin/preloaded-students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          students: [
            {
              universityId: "20201001",
              name: "Alice",
              email: "alice@juniv.edu",
              batchId: "batch-1",
              program: "HONOURS",
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.createdCount).toBe(1);
    });

    it("lists preloaded teachers", async () => {
      vi.mocked(prisma.preloadedTeacher.findMany).mockResolvedValue([
        { uniqueId: "T-01", name: "Prof. John", designation: "Professor" } as any,
      ]);
      vi.mocked(prisma.preloadedTeacher.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/admin/preloaded-teachers")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.teachers).toHaveLength(1);
    });
  });

  describe("CR Role Management API (PATCH /api/v1/admin/users/:id/role)", () => {
    it("promotes student to CR", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "student-1",
        name: "Alice",
        role: Role.STUDENT,
        batchId: "batch-1",
      } as any);
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "student-1",
        name: "Alice",
        role: Role.CR,
        batchId: "batch-1",
      } as any);

      const res = await request(app)
        .patch("/api/v1/admin/users/student-1/role")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "CR" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe("CR");
    });
  });

  describe("Audit Logs API (GET /api/v1/admin/audit-logs)", () => {
    it("returns paginated audit logs for admin", async () => {
      vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
        {
          id: "log-1",
          action: "LOGIN_SUCCESS",
          entityType: "USER",
          entityId: "user-1",
          createdAt: new Date(),
        } as any,
      ]);
      vi.mocked(prisma.auditLog.count).mockResolvedValue(1);

      const res = await request(app)
        .get("/api/v1/admin/audit-logs")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs).toHaveLength(1);
    });
  });
});
