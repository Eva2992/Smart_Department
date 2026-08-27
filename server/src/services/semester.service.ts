import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { CreateSemesterDto, UpdateSemesterDto } from "../types/academic.js";
import type { SemesterStatus, Prisma } from "@prisma/client";

export class SemesterService {
  /**
   * Create a new semester with assigned courses and teachers (FR-06, AN-03).
   */
  async createSemester(dto: CreateSemesterDto) {
    const batch = await prisma.batch.findUnique({
      where: { id: dto.batchId },
    });

    if (!batch) {
      throw new AppError("Target batch does not exist", 404, "BATCH_NOT_FOUND");
    }

    if (batch.status === "COMPLETED") {
      throw new AppError(
        "Cannot create a semester for a completed batch",
        400,
        "BATCH_ALREADY_COMPLETED"
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new AppError("Invalid start or end date", 400, "INVALID_DATE");
    }

    if (startDate >= endDate) {
      throw new AppError("Start date must be before end date", 400, "INVALID_DATE_RANGE");
    }

    // Defensive check: Verify no overlapping active semester exists for this batch
    const overlappingActiveSemester = await prisma.semester.findFirst({
      where: {
        batchId: dto.batchId,
        status: "ACTIVE",
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlappingActiveSemester) {
      throw new AppError(
        `There already exists an active semester ('${overlappingActiveSemester.name}') overlapping with these dates for this batch`,
        409,
        "SEMESTER_OVERLAP"
      );
    }

    // Validate assigned teachers exist and are teachers
    if (dto.courses && dto.courses.length > 0) {
      const teacherIds = [...new Set(dto.courses.map((c) => c.teacherId))];
      const validTeachers = await prisma.user.findMany({
        where: {
          id: { in: teacherIds },
          role: { in: ["TEACHER", "ADMIN"] },
        },
      });

      if (validTeachers.length !== teacherIds.length) {
        throw new AppError(
          "One or more assigned teachers are invalid or do not have faculty privileges",
          400,
          "INVALID_TEACHER_ASSIGNMENT"
        );
      }
    }

    const isCurrent = dto.isCurrent ?? true;

    // Transactional creation of Semester, Course assignments, and Batch currentSemester pointer
    return prisma.$transaction(async (tx) => {
      // If setting this semester as current, archive prior active semesters for this batch
      if (isCurrent) {
        await tx.semester.updateMany({
          where: {
            batchId: dto.batchId,
            status: "ACTIVE",
          },
          data: {
            status: "ARCHIVED",
            archivedAt: new Date(),
          },
        });
      }

      const createdSemester = await tx.semester.create({
        data: {
          name: dto.name,
          batchId: dto.batchId,
          startDate,
          endDate,
          status: "ACTIVE",
          courses: {
            create: dto.courses.map((c) => ({
              name: c.name,
              code: c.code,
              creditHours: c.creditHours,
              teacherId: c.teacherId,
            })),
          },
        },
        include: {
          courses: {
            include: {
              teacher: {
                select: { id: true, name: true, email: true, teacherUniqueId: true },
              },
            },
          },
          batch: true,
        },
      });

      if (isCurrent) {
        await tx.batch.update({
          where: { id: dto.batchId },
          data: { currentSemesterId: createdSemester.id },
        });
      }

      return createdSemester;
    });
  }

  /**
   * Get all semesters matching optional filters.
   */
  async getSemesters(filters?: { batchId?: string; status?: SemesterStatus }) {
    const where: Prisma.SemesterWhereInput = {};

    if (filters?.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return prisma.semester.findMany({
      where,
      orderBy: { startDate: "desc" },
      include: {
        batch: {
          select: { id: true, name: true, program: true, status: true },
        },
        courses: {
          include: {
            teacher: {
              select: { id: true, name: true, email: true, teacherUniqueId: true },
            },
          },
        },
        _count: {
          select: {
            courses: true,
            results: true,
          },
        },
      },
    });
  }

  /**
   * Get single semester with full course details.
   */
  async getSemesterById(id: string) {
    const semester = await prisma.semester.findUnique({
      where: { id },
      include: {
        batch: {
          include: {
            students: {
              select: { id: true, name: true, universityId: true, role: true, studentStatus: true },
            },
          },
        },
        courses: {
          include: {
            teacher: {
              select: { id: true, name: true, email: true, teacherUniqueId: true },
            },
            _count: {
              select: {
                scheduleEntries: true,
                assignments: true,
              },
            },
          },
        },
      },
    });

    if (!semester) {
      throw new AppError("Semester not found", 404, "NOT_FOUND");
    }

    return semester;
  }

  /**
   * Update semester basic metadata.
   */
  async updateSemester(id: string, dto: UpdateSemesterDto) {
    const existing = await prisma.semester.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Semester not found", 404, "NOT_FOUND");
    }

    const data: Prisma.SemesterUpdateInput = {};

    if (dto.name) data.name = dto.name;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);
    if (dto.status) {
      data.status = dto.status;
      if (dto.status === "ARCHIVED") {
        data.archivedAt = new Date();
      }
    }

    return prisma.semester.update({
      where: { id },
      data,
      include: {
        courses: true,
        batch: true,
      },
    });
  }
}

export const semesterService = new SemesterService();
