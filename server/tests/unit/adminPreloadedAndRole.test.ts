import { describe, it, expect, vi, beforeEach } from "vitest";
import { preloadedService } from "../../src/services/preloaded.service.js";
import { studentService } from "../../src/services/student.service.js";
import { auditService } from "../../src/services/audit.service.js";
import { prisma } from "../../src/lib/prisma.js";
import { Program, Role } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $transaction: vi.fn((callback) => callback(prisma)),
    preloadedStudent: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    preloadedTeacher: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    batch: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("Preloaded Service & Role Management Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Preloaded Students & Teachers (AN-01, AN-02)", () => {
    it("bulk creates preloaded students after validating batch", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue({ id: "batch-1", name: "51st" } as any);
      vi.mocked(prisma.preloadedStudent.upsert).mockResolvedValue({} as any);

      const result = await preloadedService.bulkCreateStudents([
        {
          universityId: "20201001",
          name: "Alice Smith",
          email: "alice@juniv.edu",
          batchId: "batch-1",
          program: Program.HONOURS,
        },
      ]);

      expect(result.createdCount).toBe(1);
      expect(prisma.preloadedStudent.upsert).toHaveBeenCalledTimes(1);
    });

    it("bulk creates preloaded teachers", async () => {
      vi.mocked(prisma.preloadedTeacher.upsert).mockResolvedValue({} as any);

      const result = await preloadedService.bulkCreateTeachers([
        {
          uniqueId: "T-01",
          name: "Dr. Alan Turing",
          email: "alan@juniv.edu",
          designation: "Professor",
          isChairman: true,
        },
      ]);

      expect(result.createdCount).toBe(1);
      expect(prisma.preloadedTeacher.upsert).toHaveBeenCalledTimes(1);
    });

    it("paginates preloaded students query", async () => {
      vi.mocked(prisma.preloadedStudent.findMany).mockResolvedValue([
        { universityId: "20201001", name: "Alice" } as any,
      ]);
      vi.mocked(prisma.preloadedStudent.count).mockResolvedValue(1);

      const res = await preloadedService.getPreloadedStudents({ page: 1, limit: 10 });
      expect(res.total).toBe(1);
      expect(res.students).toHaveLength(1);
    });
  });

  describe("CR Role Management (AN-10, C-05)", () => {
    it("promotes student to CR and demotes existing batch CR", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "student-1",
        name: "Bob",
        role: Role.STUDENT,
        batchId: "batch-51",
      } as any);
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "student-1",
        role: Role.CR,
        batchId: "batch-51",
      } as any);

      const updated = await studentService.updateUserRole(
        "student-1",
        Role.CR,
        "admin-1",
        "127.0.0.1"
      );

      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { batchId: "batch-51", role: Role.CR },
        data: { role: Role.STUDENT },
      });
      expect(updated.role).toBe(Role.CR);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("demotes CR back to normal STUDENT", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "cr-1",
        name: "Charlie",
        role: Role.CR,
        batchId: "batch-51",
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "cr-1",
        role: Role.STUDENT,
        batchId: "batch-51",
      } as any);

      const updated = await studentService.updateUserRole(
        "cr-1",
        Role.STUDENT,
        "admin-1",
        "127.0.0.1"
      );

      expect(updated.role).toBe(Role.STUDENT);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it("throws an error when promoting a user who does not belong to any batch", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-without-batch",
        role: Role.STUDENT,
        batchId: null,
      } as any);

      await expect(
        studentService.updateUserRole("user-without-batch", Role.CR, "admin-1", "127.0.0.1")
      ).rejects.toThrow("User must be enrolled in a batch");
    });
  });

  describe("Audit Service (NFR-12)", () => {
    it("creates an audit log entry", async () => {
      vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "log-1" } as any);

      await auditService.logAction({
        userId: "user-1",
        action: "LOGIN_SUCCESS",
        entityType: "USER",
        entityId: "user-1",
        ipAddress: "127.0.0.1",
        details: { method: "PASSWORD" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          action: "LOGIN_SUCCESS",
          entityType: "USER",
          entityId: "user-1",
          ipAddress: "127.0.0.1",
          details: { method: "PASSWORD" },
        },
      });
    });
  });
});
