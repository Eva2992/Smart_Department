import { describe, it, expect, vi, beforeEach } from "vitest";
import { notificationService, NotificationType } from "../../src/services/notification.service.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

describe("NotificationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a single notification for a user", async () => {
      const mockCreated = {
        id: "notif-1",
        userId: "user-1",
        type: NotificationType.CLASS_CANCELLED,
        message: "Class has been cancelled",
        relatedEntityType: "ScheduleEntry",
        relatedEntityId: "entry-1",
        isRead: false,
        createdAt: new Date(),
      };
      (prisma.notification.create as any).mockResolvedValue(mockCreated);

      const result = await notificationService.create({
        userId: "user-1",
        type: NotificationType.CLASS_CANCELLED,
        message: "Class has been cancelled",
        relatedEntityType: "ScheduleEntry",
        relatedEntityId: "entry-1",
      });

      expect(result).toEqual(mockCreated);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          type: NotificationType.CLASS_CANCELLED,
          message: "Class has been cancelled",
          relatedEntityType: "ScheduleEntry",
          relatedEntityId: "entry-1",
        },
      });
    });
  });

  describe("createBulkForBatch", () => {
    it("should fan out notifications to all students in a batch", async () => {
      (prisma.user.findMany as any).mockResolvedValue([
        { id: "student-1" },
        { id: "student-2" },
      ]);
      (prisma.notification.createMany as any).mockResolvedValue({ count: 2 });

      const result = await notificationService.createBulkForBatch(
        "batch-1",
        NotificationType.CT_SCHEDULED,
        "New CT scheduled",
        "ScheduleEntry",
        "entry-1"
      );

      expect(result).toEqual({ count: 2 });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { batchId: "batch-1" },
        select: { id: true },
      });
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: "student-1",
            type: NotificationType.CT_SCHEDULED,
            message: "New CT scheduled",
            relatedEntityType: "ScheduleEntry",
            relatedEntityId: "entry-1",
          },
          {
            userId: "student-2",
            type: NotificationType.CT_SCHEDULED,
            message: "New CT scheduled",
            relatedEntityType: "ScheduleEntry",
            relatedEntityId: "entry-1",
          },
        ],
      });
    });

    it("should return count 0 if no students in batch", async () => {
      (prisma.user.findMany as any).mockResolvedValue([]);

      const result = await notificationService.createBulkForBatch(
        "batch-empty",
        NotificationType.CT_SCHEDULED,
        "New CT scheduled"
      );

      expect(result).toEqual({ count: 0 });
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe("createBulkForAll", () => {
    it("should fan out notifications to all verified users", async () => {
      (prisma.user.findMany as any).mockResolvedValue([
        { id: "u-1" },
        { id: "u-2" },
        { id: "u-3" },
      ]);
      (prisma.notification.createMany as any).mockResolvedValue({ count: 3 });

      const result = await notificationService.createBulkForAll(
        NotificationType.HOLIDAY_DECLARED,
        "Holiday declared"
      );

      expect(result).toEqual({ count: 3 });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isVerified: true },
        select: { id: true },
      });
    });
  });

  describe("createBulkForAdmins", () => {
    it("should fan out notifications to all admin users", async () => {
      (prisma.user.findMany as any).mockResolvedValue([
        { id: "admin-1" },
        { id: "admin-2" },
      ]);
      (prisma.notification.createMany as any).mockResolvedValue({ count: 2 });

      const result = await notificationService.createBulkForAdmins(
        NotificationType.PROMOTION_REQUESTED,
        "Promotion requested"
      );

      expect(result).toEqual({ count: 2 });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: "ADMIN", isVerified: true },
        select: { id: true },
      });
    });
  });

  describe("getNotifications", () => {
    it("should return paginated notifications for a user", async () => {
      const mockNotifications = [
        {
          id: "notif-1",
          userId: "user-1",
          type: "TEST",
          message: "Msg 1",
          relatedEntityType: null,
          relatedEntityId: null,
          isRead: false,
          createdAt: new Date(),
        },
      ];
      (prisma.notification.findMany as any).mockResolvedValue(mockNotifications);
      (prisma.notification.count as any).mockResolvedValue(1);

      const result = await notificationService.getNotifications("user-1", 1, 10);

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe("getUnreadCount", () => {
    it("should count unread notifications for a user", async () => {
      (prisma.notification.count as any).mockResolvedValue(5);

      const count = await notificationService.getUnreadCount("user-1");

      expect(count).toBe(5);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("should mark a single notification as read if owned by user", async () => {
      (prisma.notification.findUnique as any).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        isRead: false,
      });
      (prisma.notification.update as any).mockResolvedValue({
        id: "notif-1",
        userId: "user-1",
        isRead: true,
      });

      const result = await notificationService.markAsRead("notif-1", "user-1");

      expect(result.isRead).toBe(true);
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: "notif-1" },
        data: { isRead: true },
      });
    });

    it("should throw 404 if notification not found", async () => {
      (prisma.notification.findUnique as any).mockResolvedValue(null);

      await expect(
        notificationService.markAsRead("notif-999", "user-1")
      ).rejects.toThrow("Notification not found");
    });

    it("should throw 403 if user does not own notification", async () => {
      (prisma.notification.findUnique as any).mockResolvedValue({
        id: "notif-1",
        userId: "other-user",
        isRead: false,
      });

      await expect(
        notificationService.markAsRead("notif-1", "user-1")
      ).rejects.toThrow("You can only mark your own notifications as read");
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all unread notifications as read for a user", async () => {
      (prisma.notification.updateMany as any).mockResolvedValue({ count: 4 });

      const result = await notificationService.markAllAsRead("user-1");

      expect(result).toEqual({ count: 4 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", isRead: false },
        data: { isRead: true },
      });
    });
  });
});
