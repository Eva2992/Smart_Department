import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { CreateBatchDto, GetBatchesQuery } from "../types/academic.js";
import type { Prisma } from "@prisma/client";

export class BatchService {
  /**
   * Create a new academic batch.
   */
  async createBatch(dto: CreateBatchDto) {
    const existing = await prisma.batch.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new AppError(`Batch '${dto.name}' already exists`, 409, "BATCH_ALREADY_EXISTS");
    }

    return prisma.batch.create({
      data: {
        name: dto.name,
        program: dto.program,
        status: "ACTIVE",
      },
      include: {
        currentSemester: true,
      },
    });
  }

  /**
   * Get list of batches with filters and counts.
   */
  async getBatches(query?: GetBatchesQuery) {
    const where: Prisma.BatchWhereInput = {};

    if (query?.program) {
      where.program = query.program;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search) {
      where.name = {
        contains: query.search,
        mode: "insensitive",
      };
    }

    const batches = await prisma.batch.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        currentSemester: {
          include: {
            courses: {
              include: {
                teacher: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        semesters: {
          orderBy: { startDate: "desc" },
          take: 5,
        },
        students: {
          where: { role: "CR" },
          select: { id: true, name: true, email: true, universityId: true, role: true },
        },
        _count: {
          select: {
            students: true,
            semesters: true,
          },
        },
      },
    });

    return batches.map((batch) => ({
      ...batch,
      cr: batch.students[0] || null,
      totalStudents: batch._count.students,
      totalSemesters: batch._count.semesters,
    }));
  }

  /**
   * Get single batch by ID.
   */
  async getBatchById(id: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        currentSemester: {
          include: {
            courses: {
              include: {
                teacher: {
                  select: { id: true, name: true, email: true, teacherUniqueId: true },
                },
              },
            },
          },
        },
        semesters: {
          orderBy: { startDate: "desc" },
          include: {
            courses: true,
          },
        },
        students: {
          select: {
            id: true,
            name: true,
            email: true,
            universityId: true,
            role: true,
            studentStatus: true,
            program: true,
            isVerified: true,
          },
          orderBy: { universityId: "asc" },
        },
        promotionRequests: {
          orderBy: { createdAt: "desc" },
          include: {
            semester: true,
            requestedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new AppError("Batch not found", 404, "NOT_FOUND");
    }

    return batch;
  }
}

export const batchService = new BatchService();
