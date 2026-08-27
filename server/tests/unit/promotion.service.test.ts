import { describe, it, expect, vi, beforeEach } from "vitest";
import { promotionService } from "../../src/services/promotion.service.js";
import { prisma } from "../../src/lib/prisma.js";
import { AppError } from "../../src/middleware/errorHandler.js";

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

describe("PromotionService (Unit Seam & ADR-0004)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestPromotion", () => {
    it("allows CR to submit promotion request when current semester is near completion", async () => {
      const mockBatch = {
        id: "batch-52",
        name: "52nd",
        currentSemesterId: "sem-1",
        status: "ACTIVE",
      };

      const mockSemester = {
        id: "sem-1",
        batchId: "batch-52",
        name: "3rd Year 2nd Semester",
        endDate: new Date(Date.now() + 3 * 24 * 3600 * 1000), // 3 days remaining (within 7 days)
        status: "ACTIVE",
      };

      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.semester.findUnique).mockResolvedValue(mockSemester as any);
      vi.mocked(prisma.promotionRequest.findFirst).mockResolvedValue(null);

      const mockCreatedRequest = {
        id: "req-1",
        batchId: "batch-52",
        semesterId: "sem-1",
        requestedById: "cr-user-id",
        status: "PENDING",
        reason: "All semester final exams concluded",
        createdAt: new Date(),
      };

      vi.mocked(prisma.promotionRequest.create).mockResolvedValue(mockCreatedRequest as any);

      const result = await promotionService.requestPromotion(
        {
          batchId: "batch-52",
          semesterId: "sem-1",
          reason: "All semester final exams concluded",
        },
        {
          userId: "cr-user-id",
          email: "cr@juniv.edu",
          role: "CR",
          name: "CR Student",
          batchId: "batch-52",
        }
      );

      expect(result.id).toBe("req-1");
      expect(result.status).toBe("PENDING");
      expect(prisma.promotionRequest.create).toHaveBeenCalled();
    });

    it("rejects promotion request if user is not from the target batch", async () => {
      await expect(
        promotionService.requestPromotion(
          {
            batchId: "batch-52",
            semesterId: "sem-1",
          },
          {
            userId: "cr-user-2",
            email: "cr51@juniv.edu",
            role: "CR",
            name: "Other CR",
            batchId: "batch-51",
          }
        )
      ).rejects.toThrow(/You can only request promotion for your own assigned batch/);
    });

    it("rejects promotion request if a pending request already exists", async () => {
      const mockBatch = {
        id: "batch-52",
        currentSemesterId: "sem-1",
        status: "ACTIVE",
      };

      const mockSemester = {
        id: "sem-1",
        batchId: "batch-52",
        endDate: new Date(Date.now() - 10000), // Ended
        status: "ACTIVE",
      };

      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.semester.findUnique).mockResolvedValue(mockSemester as any);
      vi.mocked(prisma.promotionRequest.findFirst).mockResolvedValue({
        id: "existing-req",
        status: "PENDING",
      } as any);

      await expect(
        promotionService.requestPromotion(
          {
            batchId: "batch-52",
            semesterId: "sem-1",
          },
          {
            userId: "cr-user-id",
            email: "cr@juniv.edu",
            role: "CR",
            name: "CR Student",
            batchId: "batch-52",
          }
        )
      ).rejects.toThrow(/A pending promotion request already exists for this batch/);
    });
  });

  describe("promoteBatch (ADR-0004 & FR-08)", () => {
    it("archives current semester, resets CR roles to STUDENT, advances students, and logs audit", async () => {
      const mockBatch = {
        id: "batch-52",
        name: "52nd",
        program: "HONOURS",
        status: "ACTIVE",
        currentSemesterId: "sem-1",
        currentSemester: {
          id: "sem-1",
          name: "2nd Year 2nd Semester",
          status: "ACTIVE",
        },
      };

      const mockStudents = [
        { id: "student-1", role: "STUDENT", batchId: "batch-52" },
        { id: "cr-1", role: "CR", batchId: "batch-52" },
      ];

      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockStudents as any);

      const mockNewSemester = {
        id: "sem-2",
        name: "3rd Year 1st Semester",
        batchId: "batch-52",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-12-31"),
        status: "ACTIVE",
      };

      vi.mocked(prisma.semester.create).mockResolvedValue(mockNewSemester as any);
      vi.mocked(prisma.semester.update).mockResolvedValue({} as any);
      vi.mocked(prisma.batch.update).mockResolvedValue({
        ...mockBatch,
        currentSemesterId: "sem-2",
      } as any);

      const result = await promotionService.promoteBatch(
        {
          batchId: "batch-52",
          nextSemesterName: "3rd Year 1st Semester",
          nextSemesterStartDate: "2026-07-01",
          nextSemesterEndDate: "2026-12-31",
        },
        "admin-user-id"
      );

      expect(result.success).toBe(true);
      expect(result.batchId).toBe("batch-52");

      // 1. Current semester is archived
      expect(prisma.semester.update).toHaveBeenCalledWith({
        where: { id: "sem-1" },
        data: expect.objectContaining({
          status: "ARCHIVED",
          archivedAt: expect.any(Date),
        }),
      });

      // 2. CR Role Reset rule from ADR-0004: All active CR roles reset to STUDENT
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { batchId: "batch-52", role: "CR" },
        data: { role: "STUDENT" },
      });

      // 3. Batch updated with new semester
      expect(prisma.batch.update).toHaveBeenCalledWith({
        where: { id: "batch-52" },
        data: { currentSemesterId: "sem-2" },
      });

      // 4. Audit log entry recorded
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: "admin-user-id",
          action: "BATCH_PROMOTION",
          entityType: "BATCH",
          entityId: "batch-52",
        }),
      });
    });

    it("marks batch as COMPLETED and students as GRADUATED when promoting final term", async () => {
      const mockBatch = {
        id: "batch-51",
        name: "51st",
        program: "HONOURS",
        status: "ACTIVE",
        currentSemesterId: "sem-8",
        currentSemester: {
          id: "sem-8",
          name: "4th Year 2nd Semester",
          status: "ACTIVE",
        },
      };

      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "student-1", role: "STUDENT" },
        { id: "cr-1", role: "CR" },
      ] as any);

      const result = await promotionService.promoteBatch(
        {
          batchId: "batch-51",
          isGraduation: true,
        },
        "admin-user-id"
      );

      expect(result.isGraduated).toBe(true);

      // Batch status updated to COMPLETED
      expect(prisma.batch.update).toHaveBeenCalledWith({
        where: { id: "batch-51" },
        data: {
          status: "COMPLETED",
          currentSemesterId: null,
        },
      });

      // Students marked as GRADUATED
      expect(prisma.user.updateMany).toHaveBeenCalledWith({
        where: { batchId: "batch-51" },
        data: { studentStatus: "GRADUATED" },
      });
    });
  });

  describe("rejectPromotion", () => {
    it("updates promotion request to REJECTED with reason and reviewer ID", async () => {
      const mockRequest = {
        id: "req-1",
        batchId: "batch-52",
        batch: { name: "52nd" },
        semesterId: "sem-1",
        requestedById: "cr-1",
        status: "PENDING",
      };

      vi.mocked(prisma.promotionRequest.findUnique).mockResolvedValue(mockRequest as any);
      vi.mocked(prisma.promotionRequest.update).mockResolvedValue({
        ...mockRequest,
        status: "REJECTED",
        reason: "Lab exams are still pending completion",
        reviewedById: "admin-1",
        reviewedAt: new Date(),
      } as any);

      const result = await promotionService.rejectPromotion(
        "req-1",
        "Lab exams are still pending completion",
        "admin-1"
      );

      expect(result.status).toBe("REJECTED");
      expect(prisma.promotionRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "req-1" },
          data: expect.objectContaining({
            status: "REJECTED",
            reason: "Lab exams are still pending completion",
            reviewedById: "admin-1",
          }),
        })
      );
    });
  });
});
