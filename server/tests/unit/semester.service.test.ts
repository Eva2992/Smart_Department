import { describe, it, expect, vi, beforeEach } from "vitest";
import { semesterService } from "../../src/services/semester.service.js";
import { prisma } from "../../src/lib/prisma.js";
import { AppError } from "../../src/middleware/errorHandler.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    batch: {
      findUnique: vi.fn(),
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
    course: {
      createMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe("SemesterService (Unit Seam)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createSemester", () => {
    it("successfully creates a new semester with courses and assigns as current semester", async () => {
      const mockBatch = {
        id: "batch-52",
        name: "52nd",
        program: "HONOURS",
        status: "ACTIVE",
        currentSemesterId: null,
      };

      const mockTeacher = {
        id: "teacher-1",
        name: "Dr. Kamrul Hasan",
        role: "TEACHER",
      };

      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.user.findMany).mockResolvedValue([mockTeacher] as any);
      vi.mocked(prisma.semester.findFirst).mockResolvedValue(null);

      const mockCreatedSemester = {
        id: "sem-1",
        name: "1st Year 1st Semester",
        batchId: "batch-52",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-06-30"),
        status: "ACTIVE",
        courses: [
          {
            id: "course-1",
            name: "Structured Programming",
            code: "CSE 101",
            creditHours: 3.0,
            teacherId: "teacher-1",
            semesterId: "sem-1",
          },
        ],
      };

      vi.mocked(prisma.semester.create).mockResolvedValue(mockCreatedSemester as any);
      vi.mocked(prisma.batch.update).mockResolvedValue({
        ...mockBatch,
        currentSemesterId: "sem-1",
      } as any);

      const result = await semesterService.createSemester({
        name: "1st Year 1st Semester",
        batchId: "batch-52",
        startDate: "2026-01-01",
        endDate: "2026-06-30",
        courses: [
          {
            name: "Structured Programming",
            code: "CSE 101",
            creditHours: 3.0,
            teacherId: "teacher-1",
          },
        ],
        isCurrent: true,
      });

      expect(result.id).toBe("sem-1");
      expect(result.name).toBe("1st Year 1st Semester");
      expect(prisma.semester.create).toHaveBeenCalled();
      expect(prisma.batch.update).toHaveBeenCalledWith({
        where: { id: "batch-52" },
        data: { currentSemesterId: "sem-1" },
      });
    });

    it("rejects semester creation if batch does not exist or is completed", async () => {
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(null);

      await expect(
        semesterService.createSemester({
          name: "1st Year 1st Semester",
          batchId: "non-existent-batch",
          startDate: "2026-01-01",
          endDate: "2026-06-30",
          courses: [],
        })
      ).rejects.toThrow(AppError);
    });

    it("rejects semester creation if start date is not before end date", async () => {
      const mockBatch = {
        id: "batch-52",
        name: "52nd",
        status: "ACTIVE",
      };
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);

      await expect(
        semesterService.createSemester({
          name: "1st Year 1st Semester",
          batchId: "batch-52",
          startDate: "2026-07-01",
          endDate: "2026-06-30",
          courses: [],
        })
      ).rejects.toThrow(/Start date must be before end date/);
    });

    it("rejects semester creation if an active semester with overlapping dates already exists for the batch", async () => {
      const mockBatch = {
        id: "batch-52",
        name: "52nd",
        status: "ACTIVE",
      };
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.semester.findFirst).mockResolvedValue({
        id: "existing-sem",
        name: "Conflicting Term",
        status: "ACTIVE",
      } as any);

      await expect(
        semesterService.createSemester({
          name: "1st Year 1st Semester",
          batchId: "batch-52",
          startDate: "2026-01-01",
          endDate: "2026-06-30",
          courses: [],
        })
      ).rejects.toThrow(/already exists an active semester/);
    });

    it("rejects semester creation if any assigned teacher does not exist or is not a TEACHER", async () => {
      const mockBatch = {
        id: "batch-52",
        name: "52nd",
        status: "ACTIVE",
      };
      vi.mocked(prisma.batch.findUnique).mockResolvedValue(mockBatch as any);
      vi.mocked(prisma.semester.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.findMany).mockResolvedValue([]); // Teacher not found

      await expect(
        semesterService.createSemester({
          name: "1st Year 1st Semester",
          batchId: "batch-52",
          startDate: "2026-01-01",
          endDate: "2026-06-30",
          courses: [
            {
              name: "Course 1",
              code: "CSE 101",
              creditHours: 3.0,
              teacherId: "invalid-teacher-id",
            },
          ],
        })
      ).rejects.toThrow(/One or more assigned teachers are invalid/);
    });
  });

  describe("getSemesters & getSemesterById", () => {
    it("returns list of semesters with courses and batch info", async () => {
      const mockSemesters = [
        {
          id: "sem-1",
          name: "1st Year 1st Semester",
          batchId: "batch-52",
          batch: { id: "batch-52", name: "52nd" },
          courses: [],
        },
      ];
      vi.mocked(prisma.semester.findMany).mockResolvedValue(mockSemesters as any);

      const result = await semesterService.getSemesters({ batchId: "batch-52" });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("1st Year 1st Semester");
    });

    it("throws NOT_FOUND if single semester does not exist", async () => {
      vi.mocked(prisma.semester.findUnique).mockResolvedValue(null);

      await expect(semesterService.getSemesterById("missing-id")).rejects.toThrow(AppError);
    });
  });
});
