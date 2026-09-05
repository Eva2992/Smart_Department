import type { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service.js";
import { sendSuccess } from "../utils/response.js";

/**
 * GET /api/v1/notifications?page=&limit=
 * Returns paginated notifications for the authenticated user.
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await notificationService.getNotifications(userId, page, limit);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Returns the count of unread notifications for the authenticated user.
 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);
    sendSuccess(res, { count });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a single notification as read.
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const notificationId = String(req.params.id);

    const updated = await notificationService.markAsRead(notificationId, userId);
    sendSuccess(res, updated, "Notification marked as read");
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/mark-all-read
 * Mark all unread notifications as read for the authenticated user.
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const result = await notificationService.markAllAsRead(userId);
    sendSuccess(res, result, `${result.count} notification(s) marked as read`);
  } catch (err) {
    next(err);
  }
}
