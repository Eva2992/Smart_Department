import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type { RequestPromotionDto, PromoteBatchDto } from "../types/academic.js";
import type { AccessTokenPayload } from "../types/auth.js";
import type { PromotionStatus, Prisma } from "@prisma/client";

export class PromotionService {
  /**
   * Submit a promotion request on behalf of a batch (CR only - FR-07).
   */
  async requestPromotion(dto: RequestPromotionDto, crUser: AccessTokenPayload) {
    if (crUser.role !== "CR" && crUser.role !== "ADMIN") {
      throw new AppError(
        "Only appointed Class Representatives (CR) or Admins can submit semester promotion requests",
        403,
        "FORBIDDEN"
      );
    }

    if (crUser.role === "CR" && crUser.batchId !== dto.batchId) {
      throw new AppError(
        "You can only request promotion for your own assigned batch",
        403,
        "FORBIDDEN_BATCH_MISMATCH"
      );
    }

    const batch = await prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: { currentSemester: true },
    });

    if (!batch) {
      throw new AppError("Batch not found", 404, "BATCH_NOT_FOUND");
    }

    if (batch.status === "COMPLETED") {
      throw new AppError(
        "This batch is already completed and graduated",
        400,
        "BATCH_ALREADY_COMPLETED"
      );
    }

    const currentSemester = await prisma.semester.findUnique({
      where: { id: dto.semesterId },
    });

    if (!currentSemester || currentSemester.batchId !== dto.batchId) {
      throw new AppError(
        "Specified semester does not belong to this batch",
        400,
        "INVALID_SEMESTER"
      );
    }

    // FR-07 Rule: Promotion request allowed when semester end date has passed or within 7 days
    const now = new Date();
    const endDate = new Date(currentSemester.endDate);
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const diffMs = endDate.getTime() - now.getTime();

    // If end date is in the future by more than 7 days and user is not admin
    if (diffMs > sevenDaysInMs && crUser.role !== "ADMIN") {
      throw new AppError(
        "Semester promotion requests can only be submitted within 7 days of semester completion or after the end date",
        400,
        "PROMOTION_TOO_EARLY"
      );
    }

    // Check for existing pending request
    const existingPending = await prisma.promotionRequest.findFirst({
      where: {
        batchId: dto.batchId,
        semesterId: dto.semesterId,
        status: "PENDING",
      },
    });

    if (existingPending) {
      throw new AppError(
        "A pending promotion request already exists for this batch",
        409,
        "PENDING_REQUEST_EXISTS"
      );
    }

    return prisma.promotionRequest.create({
      data: {
        batchId: dto.batchId,
        semesterId: dto.semesterId,
        requestedById: crUser.userId,
        reason: dto.reason || "Semester term coursework and examinations completed",
        status: "PENDING",
      },
      include: {
        batch: { select: { id: true, name: true, program: true } },
        semester: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  }

  /**
   * Process and execute batch promotion (Admin only - FR-08, ADR-0004).
   * - Archives previous semester routines and active schedule instances
   * - Automatically resets all CR accounts in the batch to STUDENT (ADR-0004)
   * - Advances batch to next semester or marks as COMPLETED
   * - Generates audit log and user notifications
   */
  async promoteBatch(dto: PromoteBatchDto, adminUserId: string, ipAddress = "127.0.0.1") {
    const batch = await prisma.batch.findUnique({
      where: { id: dto.batchId },
      include: {
        currentSemester: true,
      },
    });

    if (!batch) {
      throw new AppError("Target batch not found", 404, "BATCH_NOT_FOUND");
    }

    if (batch.status === "COMPLETED") {
      throw new AppError("Batch is already completed", 400, "BATCH_ALREADY_COMPLETED");
    }

    const previousSemesterId = batch.currentSemesterId;

    return prisma.$transaction(async (tx) => {
      // 1. Archive previous semester if one exists
      if (previousSemesterId) {
        await tx.semester.update({
          where: { id: previousSemesterId },
          data: {
            status: "ARCHIVED",
            archivedAt: new Date(),
          },
        });

        // Archive / cancel any lingering active schedule entries for this batch
        await tx.scheduleEntry.updateMany({
          where: {
            batchId: dto.batchId,
            status: "SCHEDULED",
          },
          data: {
            status: "CANCELLED",
          },
        });
      }

      // 2. CR Role Reset rule from ADR-0004:
      // Reset all CR accounts in this batch to STUDENT role
      await tx.user.updateMany({
        where: {
          batchId: dto.batchId,
          role: "CR",
        },
        data: {
          role: "STUDENT",
        },
      });

      let nextSemesterId: string | null = null;
      let isGraduated = false;

      // 3. Check if this is graduation / final semester completion
      if (dto.isGraduation) {
        isGraduated = true;
        await tx.batch.update({
          where: { id: dto.batchId },
          data: {
            status: "COMPLETED",
            currentSemesterId: null,
          },
        });

        // Mark all batch students as GRADUATED
        await tx.user.updateMany({
          where: { batchId: dto.batchId },
          data: { studentStatus: "GRADUATED" },
        });
      } else if (dto.nextSemesterName) {
        // Create the new sequential semester shell
        const startDate = dto.nextSemesterStartDate
          ? new Date(dto.nextSemesterStartDate)
          : new Date();
        const endDate = dto.nextSemesterEndDate
          ? new Date(dto.nextSemesterEndDate)
          : new Date(startDate.getTime() + 180 * 24 * 60 * 60 * 1000);

        const newSemester = await tx.semester.create({
          data: {
            name: dto.nextSemesterName,
            batchId: dto.batchId,
            startDate,
            endDate,
            status: "ACTIVE",
          },
        });

        nextSemesterId = newSemester.id;

        await tx.batch.update({
          where: { id: dto.batchId },
          data: { currentSemesterId: newSemester.id },
        });

        // Set student status to PROMOTED / ACTIVE
        await tx.user.updateMany({
          where: {
            batchId: dto.batchId,
            studentStatus: { in: ["ACTIVE", "PROMOTED"] },
          },
          data: { studentStatus: "PROMOTED" },
        });
      } else {
        // Clear current semester pointer until new semester is configured
        await tx.batch.update({
          where: { id: dto.batchId },
          data: { currentSemesterId: null },
        });
      }

      // 4. Update promotion request if one was associated
      if (dto.promotionRequestId) {
        await tx.promotionRequest.update({
          where: { id: dto.promotionRequestId },
          data: {
            status: "APPROVED",
            reviewedById: adminUserId,
            reviewedAt: new Date(),
          },
        });
      }

      // 5. Create Audit Log entry for accountability
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "BATCH_PROMOTION",
          entityType: "BATCH",
          entityId: dto.batchId,
          ipAddress,
          details: {
            batchName: batch.name,
            program: batch.program,
            previousSemesterId,
            nextSemesterId,
            isGraduated,
            crRolesReset: true,
          },
        },
      });

      // 6. Notify batch students of promotion
      const students = await tx.user.findMany({
        where: { batchId: dto.batchId },
        select: { id: true },
      });

      if (students.length > 0) {
        await tx.notification.createMany({
          data: students.map((s) => ({
            userId: s.id,
            type: "PROMOTION",
            message: isGraduated
              ? `Congratulations! Batch ${batch.name} has completed graduation.`
              : `Batch ${batch.name} has been promoted to the next semester. Please note CR designation has been reset.`,
            relatedEntityType: "BATCH",
            relatedEntityId: dto.batchId,
          })),
        });
      }

      return {
        success: true,
        batchId: dto.batchId,
        previousSemesterId,
        nextSemesterId,
        isGraduated,
        crRolesReset: true,
        message: isGraduated
          ? `Batch ${batch.name} graduated successfully.`
          : `Batch ${batch.name} promoted successfully. All CR roles have been reset to Student per ADR-0004.`,
      };
    });
  }

  /**
   * Reject a promotion request with reason (Admin only).
   */
  async rejectPromotion(id: string, reason: string, adminUserId: string) {
    const request = await prisma.promotionRequest.findUnique({
      where: { id },
      include: { requestedBy: true, batch: true },
    });

    if (!request) {
      throw new AppError("Promotion request not found", 404, "NOT_FOUND");
    }

    if (request.status !== "PENDING") {
      throw new AppError(
        `Cannot reject a promotion request that is ${request.status}`,
        400,
        "INVALID_STATE"
      );
    }

    const updated = await prisma.promotionRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reason,
        reviewedById: adminUserId,
        reviewedAt: new Date(),
      },
      include: {
        batch: true,
        semester: true,
        requestedBy: true,
      },
    });

    // Notify CR who requested the promotion
    await prisma.notification.create({
      data: {
        userId: request.requestedById,
        type: "PROMOTION_REJECTED",
        message: `Promotion request for Batch ${request.batch.name} was rejected: ${reason}`,
        relatedEntityType: "PROMOTION_REQUEST",
        relatedEntityId: id,
      },
    });

    return updated;
  }

  /**
   * Get all promotion requests with filter.
   */
  async getPromotionRequests(filters?: { status?: PromotionStatus; batchId?: string }) {
    const where: Prisma.PromotionRequestWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.batchId) {
      where.batchId = filters.batchId;
    }

    return prisma.promotionRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        batch: { select: { id: true, name: true, program: true, status: true } },
        semester: { select: { id: true, name: true, startDate: true, endDate: true } },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true, universityId: true },
        },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

export const promotionService = new PromotionService();
