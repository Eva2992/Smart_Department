import { describe, it, expect, vi, beforeEach } from "vitest";
import { studentService } from "../../src/services/student.service.js";
import { prisma } from "../../src/lib/prisma.js";
import { AppError } from "../../src/middleware/errorHandler.js";

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

describe("StudentService (Unit Seam & FR-09 Override)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchStudents", () => {
    it("searches students by university ID and name with pagination", async () => {
      const mockStudents = [
        {
          id: "student-1",
          name: "Tahmid Hasan",
          universityId: "2021-1-60-001",
          email: "student52_1@juniv.edu",
          role: "STUDENT",
          studentStatus: "ACTIVE",
          batchId: "batch-52",
          batch: { id: "batch-52", name: "52nd" },
        },
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockStudents as any);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const result = await studentService.searchStudents({
        q: "Tahmid",
        page: 1,
        limit: 10,
      });

      expect(result.students).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.students[0].name).toBe("Tahmid Hasan");
    });
  });

  describe("overrideSemester (FR-09)", () => {
    it("successfully overrides student batch and status, and logs audit trail", async () => {
      const mockStudent = {
        id: "student-1",
        name: "Readmitted Student",
        email: "student@juniv.edu",
        universityId: "2020-1-60-005",
        role: "STUDENT",
        studentStatus: "ACTIVE",
        batchId: "batch-51",
      };

      const mockTargetBatch = {
        id: "batch-52",
        name: "52nd",
        status: "ACTIVE",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockTargetBatch as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockStudent,
        batchId: "batch-52",
        studentStatus: "DEMOTED",
      } as any);

      const result = await studentService.overrideSemester(
        "student-1",
        {
          batchId: "batch-52",
          studentStatus: "DEMOTED",
          reason: "Readmitted to Batch 52 following medical leave",
        },
        "admin-user-1",
        "127.0.0.1"
      );

      expect(result.batchId).toBe("batch-52");
      expect(result.studentStatus).toBe("DEMOTED");

      // Verifies Audit Log entry is created
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "admin-user-1",
          action: "STUDENT_SEMESTER_OVERRIDE",
          entityType: "USER",
          entityId: "student-1",
          ipAddress: "127.0.0.1",
          details: expect.objectContaining({
            reason: "Readmitted to Batch 52 following medical leave",
            previousBatchId: "batch-51",
            newBatchId: "batch-52",
            newStudentStatus: "DEMOTED",
          }),
        }),
      });
    });

    it("throws NOT_FOUND if student does not exist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(
        studentService.overrideSemester(
          "invalid-student-id",
          { studentStatus: "DROPOUT" },
          "admin-1"
        )
      ).rejects.toThrow(AppError);
    });
  });

  describe("assignCR", () => {
    it("demotes prior batch CR to STUDENT and promotes selected student to CR", async () => {
      const mockStudent = {
        id: "student-2",
        name: "New CR Candidate",
        role: "STUDENT",
        batchId: "batch-52",
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);
      vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...mockStudent,
        role: "CR",
      } as any);

      const result = await studentService.assignCR(
        "batch-52",
        "student-2",
        "admin-user-1",
        "127.0.0.1"
      );

      expect(result.role).toBe("CR");
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { batchId: "batch-52", role: "CR" },
        data: { role: "STUDENT" },
      });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "student-2" },
          data: { role: "CR" },
        })
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
