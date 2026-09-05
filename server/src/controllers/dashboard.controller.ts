import type { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service.js";
import { sendSuccess } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * GET /api/v1/dashboard/student
 * Student Dashboard aggregation (FR-28).
 */
export async function getStudentDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;

    if (!user.batchId) {
      throw new AppError(
        "Student batch not found. Dashboard requires batch assignment.",
        400,
        "BATCH_REQUIRED"
      );
    }

    const data = await dashboardService.getStudentDashboard(user.id, user.batchId);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/teacher
 * Teacher Dashboard aggregation (FR-29).
 */
export async function getTeacherDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    const data = await dashboardService.getTeacherDashboard(user.id);
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/admin
 * Admin Dashboard aggregation (FR-30).
 */
export async function getAdminDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await dashboardService.getAdminDashboard();
    sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}
