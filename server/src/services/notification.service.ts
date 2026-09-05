import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Notification type constants used across the notification system (FR-31).
 */
export const NotificationType = {
  CLASS_CANCELLED: "CLASS_CANCELLED",
  CLASS_RESCHEDULED: "CLASS_RESCHEDULED",
  CLASS_TIME_UPDATED: "CLASS_TIME_UPDATED",
  CLASS_CHANGE_REQUEST_SUBMITTED: "CLASS_CHANGE_REQUEST_SUBMITTED",
  CLASS_CHANGE_REQUEST_REVIEWED: "CLASS_CHANGE_REQUEST_REVIEWED",
  CT_SCHEDULED: "CT_SCHEDULED",
  CT_MARKS_UPLOADED: "CT_MARKS_UPLOADED",
  ASSIGNMENT_CREATED: "ASSIGNMENT_CREATED",
  PROMOTION_REQUESTED: "PROMOTION_REQUESTED",
  PROMOTION_APPROVED: "PROMOTION",
  PROMOTION_REJECTED: "PROMOTION_REJECTED",
  HOLIDAY_DECLARED: "HOLIDAY_DECLARED",
  RESOURCE_UPLOADED: "RESOURCE_UPLOADED",
  RESULT_PUBLISHED: "RESULT_PUBLISHED",
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

export interface CreateNotificationInput {
  userId: string;
  type: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface PaginatedNotificationsResponse {
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    message: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
    isRead: boolean;
    createdAt: Date;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class NotificationService {
  /**
   * Creates a single notification for a specific user.
   */
  async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        message: input.message,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
      },
    });
  }

  /**
   * Fan-out: creates notifications for all students in a given batch.
   */
  async createBulkForBatch(
    batchId: string,
    type: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    const students =
      (prisma.user?.findMany
        ? await prisma.user.findMany({
            where: { batchId },
            select: { id: true },
          })
        : []) || [];

    if (students.length === 0) return { count: 0 };

    const result = prisma.notification?.createMany
      ? await prisma.notification.createMany({
          data: students.map((s) => ({
            userId: s.id,
            type,
            message,
            relatedEntityType: relatedEntityType ?? null,
            relatedEntityId: relatedEntityId ?? null,
          })),
        })
      : { count: 0 };

    return { count: result.count };
  }

  /**
   * Fan-out: creates notifications for ALL authenticated users (e.g., holiday declaration).
   */
  async createBulkForAll(
    type: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    const users =
      (prisma.user?.findMany
        ? await prisma.user.findMany({
            where: { isVerified: true },
            select: { id: true },
          })
        : []) || [];

    if (users.length === 0) return { count: 0 };

    const result = prisma.notification?.createMany
      ? await prisma.notification.createMany({
          data: users.map((u) => ({
            userId: u.id,
            type,
            message,
            relatedEntityType: relatedEntityType ?? null,
            relatedEntityId: relatedEntityId ?? null,
          })),
        })
      : { count: 0 };

    return { count: result.count };
  }

  /**
   * Fan-out: creates notifications for all admin users.
   */
  async createBulkForAdmins(
    type: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: string
  ) {
    const admins =
      (prisma.user?.findMany
        ? await prisma.user.findMany({
            where: { role: "ADMIN", isVerified: true },
            select: { id: true },
          })
        : []) || [];

    if (admins.length === 0) return { count: 0 };

    const result = prisma.notification?.createMany
      ? await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.id,
            type,
            message,
            relatedEntityType: relatedEntityType ?? null,
            relatedEntityId: relatedEntityId ?? null,
          })),
        })
      : { count: 0 };

    return { count: result.count };
  }

  /**
   * Paginated notification retrieval for a user, newest first.
   */
  async getNotifications(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedNotificationsResponse> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Returns the count of unread notifications for a user (badge count).
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Mark a single notification as read (with ownership check).
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
    }

    if (notification.userId !== userId) {
      throw new AppError("You can only mark your own notifications as read", 403, "FORBIDDEN");
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a specific user.
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }
}

export const notificationService = new NotificationService();
