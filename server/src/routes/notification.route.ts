import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller.js";

const notificationRouter = Router();

// All notification endpoints require authentication
notificationRouter.use(authenticate);

// GET /api/v1/notifications?page=&limit=
notificationRouter.get("/", getNotifications);

// GET /api/v1/notifications/unread-count
notificationRouter.get("/unread-count", getUnreadCount);

// PATCH /api/v1/notifications/mark-all-read  (must come before /:id routes)
notificationRouter.patch("/mark-all-read", markAllAsRead);

// PATCH /api/v1/notifications/:id/read
notificationRouter.patch("/:id/read", markAsRead);

export { notificationRouter };
