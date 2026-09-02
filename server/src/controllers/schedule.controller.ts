import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { scheduleService } from "../services/scheduleService.js";
import { conflictService } from "../services/conflictService.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

// Validation Schemas
const checkConflictSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  roomId: z.string().optional(),
  teacherId: z.string().optional(),
  batchId: z.string().optional(),
  excludeScheduleEntryId: z.string().optional(),
});

const rescheduleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  roomId: z.string().optional(),
  reason: z.string().optional(),
});

const updateTimeSchema = z.object({
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  reason: z.string().optional(),
});

const cancelClassSchema = z.object({
  reason: z.string().optional(),
});

export class ScheduleController {
  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, startDate, endDate, batchId, teacherId, roomId, status, type } = req.query;
      const data = await scheduleService.getSchedule({
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        batchId: batchId as string,
        teacherId: teacherId as string,
        roomId: roomId as string,
        status: status as any,
        type: type as any,
      });
      sendSuccess(res, data, "Schedule retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const data = await scheduleService.getMySchedule(req.user, req.query as any);
      sendSuccess(res, data, "Personal schedule retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async getScheduleById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await scheduleService.getScheduleById(req.params.id as string);
      sendSuccess(res, data, "Schedule entry retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async checkConflict(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = checkConflictSchema.parse(req.body);
      const data = await conflictService.checkConflict(body);
      sendSuccess(res, data, "Conflict check evaluated");
    } catch (err) {
      next(err);
    }
  }

  async rescheduleClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = rescheduleSchema.parse(req.body);
      const data = await scheduleService.rescheduleClass(req.params.id as string, body, req.user);
      sendSuccess(res, data, "Class rescheduled successfully");
    } catch (err) {
      next(err);
    }
  }

  async updateClassTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = updateTimeSchema.parse(req.body);
      const data = await scheduleService.updateClassTime(req.params.id as string, body, req.user);
      sendSuccess(res, data, "Class time updated successfully");
    } catch (err) {
      next(err);
    }
  }

  async cancelClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = cancelClassSchema.parse(req.body || {});
      const data = await scheduleService.cancelClass(req.params.id as string, body, req.user);
      sendSuccess(res, data, "Class cancelled successfully");
    } catch (err) {
      next(err);
    }
  }

  async getClassCounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const { batchId, teacherId } = req.query;
      const data = await scheduleService.getClassCounts(req.user, {
        batchId: batchId as string,
        teacherId: teacherId as string,
      });
      sendSuccess(res, data, "Class counts retrieved successfully");
    } catch (err) {
      next(err);
    }
  }
}

export const scheduleController = new ScheduleController();
