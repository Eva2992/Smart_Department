import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { OverrideStudentSemesterDto, SearchStudentsQuery } from "../types/academic.js";
import type { Prisma } from "@prisma/client";

export class StudentService {
  /**
   * Search students with pagination and multifaceted filters.
   */
  async searchStudents(query: SearchStudentsQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: query.role ? query.role : { in: ["STUDENT", "CR"] },
    };

    if (query.batchId) {
      where.batchId = query.batchId;
    }

    if (query.program) {
      where.program = query.program;
    }

    if (query.studentStatus) {
      where.studentStatus = query.studentStatus;
    }

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { universityId: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ batch: { name: "asc" } }, { universityId: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          universityId: true,
          role: true,
          studentStatus: true,
          program: true,
          batchId: true,
          batch: {
            select: {
              id: true,
              name: true,
              program: true,
              status: true,
              currentSemester: {
                select: { id: true, name: true },
              },
            },
          },
          isVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
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
   * Override a student's semester, batch, or academic status (Admin only - FR-09).
   */
  async overrideSemester(
    studentId: string,
    dto: OverrideStudentSemesterDto,
    adminUserId: string,
    ipAddress = "127.0.0.1"
  ) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { batch: true },
    });

    if (!student) {
      throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
    }

    if (student.role !== "STUDENT" && student.role !== "CR") {
      throw new AppError(
        "Only student accounts can be overridden via this method",
        400,
        "INVALID_ROLE"
      );
    }

    let targetBatchName: string | undefined;

    if (dto.batchId) {
      const targetBatch = await prisma.batch.findUnique({
        where: { id: dto.batchId },
      });

      if (!targetBatch) {
        throw new AppError("Target batch does not exist", 404, "BATCH_NOT_FOUND");
      }
      targetBatchName = targetBatch.name;
    }

    const previousState = {
      batchId: student.batchId,
      batchName: student.batch?.name,
      studentStatus: student.studentStatus,
      role: student.role,
    };

    return prisma.$transaction(async (tx) => {
      const updateData: Prisma.UserUpdateInput = {};

      if (dto.batchId !== undefined) updateData.batch = { connect: { id: dto.batchId } };
      if (dto.studentStatus !== undefined) updateData.studentStatus = dto.studentStatus;
      if (dto.role !== undefined) updateData.role = dto.role;

      const updatedStudent = await tx.user.update({
        where: { id: studentId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          universityId: true,
          role: true,
          studentStatus: true,
          batchId: true,
          program: true,
        },
      });

      // FR-09: Create immutable AuditLog recording the change and admin identity
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "STUDENT_SEMESTER_OVERRIDE",
          entityType: "USER",
          entityId: studentId,
          ipAddress,
          details: {
            studentName: student.name,
            universityId: student.universityId,
            reason: dto.reason || "Manual semester/status override by department admin",
            previousBatchId: previousState.batchId,
            previousBatchName: previousState.batchName,
            previousStudentStatus: previousState.studentStatus,
            previousRole: previousState.role,
            newBatchId: dto.batchId || previousState.batchId,
            newBatchName: targetBatchName || previousState.batchName,
            newStudentStatus: dto.studentStatus || previousState.studentStatus,
            newRole: dto.role || previousState.role,
          },
        },
      });

      return updatedStudent;
    });
  }

  /**
   * Explicitly assign a student as Class Representative (CR) for a batch.
   */
  async assignCR(batchId: string, studentId: string, adminUserId: string, ipAddress = "127.0.0.1") {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new AppError("Student not found", 404, "NOT_FOUND");
    }

    if (student.batchId !== batchId) {
      throw new AppError("Target student does not belong to this batch", 400, "BATCH_MISMATCH");
    }

    return prisma.$transaction(async (tx) => {
      // Demote existing CR(s) of this batch to STUDENT
      await tx.user.updateMany({
        where: {
          batchId,
          role: "CR",
        },
        data: {
          role: "STUDENT",
        },
      });

      // Promote selected student to CR
      const promotedCR = await tx.user.update({
        where: { id: studentId },
        data: { role: "CR" },
        select: {
          id: true,
          name: true,
          email: true,
          universityId: true,
          role: true,
          batchId: true,
        },
      });

      // Log audit entry
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "ASSIGN_CR",
          entityType: "USER",
          entityId: studentId,
          ipAddress,
          details: {
            batchId,
            studentName: student.name,
            universityId: student.universityId,
          },
        },
      });

      return promotedCR;
    });
  }
}

export const studentService = new StudentService();
