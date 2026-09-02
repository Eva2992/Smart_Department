import { prisma } from "../lib/prisma.js";
import { Prisma } from "@prisma/client";

export interface LogActionParams {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string;
  details?: Prisma.InputJsonValue;
}

export interface GetAuditLogsParams {
  action?: string;
  userId?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export class AuditService {
  /**
   * Records an immutable audit log entry (NFR-12, R-02, R-06).
   */
  async logAction(params: LogActionParams): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          ipAddress: params.ipAddress || "127.0.0.1",
          details: params.details ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      console.error("[AuditService] Failed to record audit log:", err);
      // Non-blocking: audit failure should not break user operations
    }
  }

  /**
   * Retrieves paginated audit logs for admin inspection with flexible filters.
   */
  async getAuditLogs(params: GetAuditLogsParams = {}) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) {
      where.action = { contains: params.action, mode: "insensitive" };
    }
    if (params.userId) {
      where.userId = params.userId;
    }
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              universityId: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const auditService = new AuditService();
