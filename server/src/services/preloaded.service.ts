import { prisma } from "../lib/prisma.js";
import type { PreloadedStudent, PreloadedTeacher, Program } from "@prisma/client";

export interface VerifyStudentParams {
  universityId: string;
  email?: string;
  batchId?: string;
  program?: Program;
}

export interface VerifyTeacherParams {
  teacherUniqueId: string;
  email: string;
}

export interface VerificationResult<T> {
  valid: boolean;
  error?: string;
  preloadedRecord?: T;
}

export class PreloadedService {
  /**
   * Verifies if a student exists in the preloaded roster and is not yet registered.
   */
  async verifyStudentRoster(
    params: VerifyStudentParams
  ): Promise<VerificationResult<PreloadedStudent>> {
    const { universityId, email, batchId, program } = params;

    const preloaded = await prisma.preloadedStudent.findUnique({
      where: { universityId },
    });

    if (!preloaded) {
      return {
        valid: false,
        error: "Your information does not match our records. Please contact the department admin.",
      };
    }

    // Check if already registered
    const existingUser = await prisma.user.findUnique({
      where: { universityId },
    });

    if (existingUser) {
      return {
        valid: false,
        error: "An account is already registered with this university ID.",
      };
    }

    // Verify email match if provided
    if (email && email.trim().toLowerCase() !== preloaded.email.trim().toLowerCase()) {
      return {
        valid: false,
        error: "Email does not match preloaded record for this university ID.",
      };
    }

    // Verify batch match if provided
    if (batchId && batchId !== preloaded.batchId) {
      return {
        valid: false,
        error: "Batch does not match preloaded record.",
      };
    }

    // Verify program match if provided
    if (program && program !== preloaded.program) {
      return {
        valid: false,
        error: "Program does not match preloaded record.",
      };
    }

    return {
      valid: true,
      preloadedRecord: preloaded,
    };
  }

  /**
   * Verifies if a teacher exists in the preloaded roster and is not yet registered.
   */
  async verifyTeacherRoster(
    params: VerifyTeacherParams
  ): Promise<VerificationResult<PreloadedTeacher>> {
    const { teacherUniqueId, email } = params;

    const preloaded = await prisma.preloadedTeacher.findUnique({
      where: { uniqueId: teacherUniqueId },
    });

    if (!preloaded) {
      return {
        valid: false,
        error: "Teacher ID not found in department roster. Please contact the department admin.",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { teacherUniqueId },
    });

    if (existingUser) {
      return {
        valid: false,
        error: "An account is already registered with this Teacher ID.",
      };
    }

    if (email.trim().toLowerCase() !== preloaded.email.trim().toLowerCase()) {
      return {
        valid: false,
        error: "Email does not match the official teacher record.",
      };
    }

    return {
      valid: true,
      preloadedRecord: preloaded,
    };
  }

  /**
   * Bulk imports or updates preloaded students (AN-01).
   */
  async bulkCreateStudents(
    students: Array<{
      universityId: string;
      name: string;
      email: string;
      batchId: string;
      program: Program;
    }>,
    adminUserId?: string,
    ipAddress?: string
  ): Promise<{ createdCount: number }> {
    if (!students || students.length === 0) {
      return { createdCount: 0 };
    }

    let createdCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of students) {
        // Validate batch exists
        const batch = await tx.batch.findUnique({
          where: { id: item.batchId },
        });
        if (!batch) {
          throw new Error(`Batch '${item.batchId}' not found`);
        }

        await tx.preloadedStudent.upsert({
          where: { universityId: item.universityId },
          create: {
            universityId: item.universityId,
            name: item.name,
            email: item.email.trim().toLowerCase(),
            batchId: item.batchId,
            program: item.program,
          },
          update: {
            name: item.name,
            email: item.email.trim().toLowerCase(),
            batchId: item.batchId,
            program: item.program,
          },
        });
        createdCount++;
      }

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: "PRELOADED_STUDENTS_IMPORT",
            entityType: "PRELOADED_STUDENT",
            entityId: "BULK",
            ipAddress: ipAddress || "127.0.0.1",
            details: { count: createdCount },
          },
        });
      }
    });

    return { createdCount };
  }

  /**
   * Retrieves paginated preloaded students with optional batch filtering.
   */
  async getPreloadedStudents(params: {
    batchId?: string;
    program?: Program;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.batchId) where.batchId = params.batchId;
    if (params.program) where.program = params.program;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { universityId: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.preloadedStudent.findMany({
        where,
        skip,
        take: limit,
        include: { batch: { select: { id: true, name: true } } },
        orderBy: { universityId: "asc" },
      }),
      prisma.preloadedStudent.count({ where }),
    ]);

    return {
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Bulk imports or updates preloaded teachers (AN-02).
   */
  async bulkCreateTeachers(
    teachers: Array<{
      uniqueId: string;
      name: string;
      email: string;
      designation: string;
      isChairman?: boolean;
    }>,
    adminUserId?: string,
    ipAddress?: string
  ): Promise<{ createdCount: number }> {
    if (!teachers || teachers.length === 0) {
      return { createdCount: 0 };
    }

    let createdCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of teachers) {
        await tx.preloadedTeacher.upsert({
          where: { uniqueId: item.uniqueId },
          create: {
            uniqueId: item.uniqueId,
            name: item.name,
            email: item.email.trim().toLowerCase(),
            designation: item.designation,
            isChairman: Boolean(item.isChairman),
          },
          update: {
            name: item.name,
            email: item.email.trim().toLowerCase(),
            designation: item.designation,
            isChairman: Boolean(item.isChairman),
          },
        });
        createdCount++;
      }

      if (adminUserId) {
        await tx.auditLog.create({
          data: {
            userId: adminUserId,
            action: "PRELOADED_TEACHERS_IMPORT",
            entityType: "PRELOADED_TEACHER",
            entityId: "BULK",
            ipAddress: ipAddress || "127.0.0.1",
            details: { count: createdCount },
          },
        });
      }
    });

    return { createdCount };
  }

  /**
   * Retrieves paginated preloaded teachers.
   */
  async getPreloadedTeachers(params: { search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { uniqueId: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { designation: { contains: params.search, mode: "insensitive" } },
      ];
    }

    const [teachers, total] = await Promise.all([
      prisma.preloadedTeacher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { uniqueId: "asc" },
      }),
      prisma.preloadedTeacher.count({ where }),
    ]);

    return {
      teachers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const preloadedService = new PreloadedService();
