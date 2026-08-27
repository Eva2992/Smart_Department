import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { scheduleService } from "../services/scheduleService.js";
import { sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

const templateItemSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  courseId: z.string().min(1, "courseId is required"),
  teacherId: z.string().min(1, "teacherId is required"),
  roomId: z.string().min(1, "roomId is required"),
  startTime: z.string().min(1, "startTime is required"),
  endTime: z.string().min(1, "endTime is required"),
  type: z.enum(["CLASS", "CT", "EXAM", "SEMINAR"]).optional(),
});

const generateRoutineSchema = z.object({
  batchId: z.string().min(1, "batchId is required"),
  semesterId: z.string().min(1, "semesterId is required"),
  startDate: z.string().min(1, "startDate is required"),
  endDate: z.string().min(1, "endDate is required"),
  template: z.array(templateItemSchema).min(1, "At least one template item is required"),
});

export class RoutineController {
  async generateRoutine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = generateRoutineSchema.parse(req.body);
      const result = await scheduleService.generateRoutine(body, req.user);
      sendCreated(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }
}

export const routineController = new RoutineController();
