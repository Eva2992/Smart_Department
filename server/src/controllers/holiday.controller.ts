import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { holidayService } from "../services/holidayService.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

const declareHolidaySchema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z.string().min(1, "Holiday reason is required"),
  scope: z.enum(["ALL", "BATCH"]).optional(),
  batchId: z.string().optional(),
});

export class HolidayController {
  async declareHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = declareHolidaySchema.parse(req.body);
      const result = await holidayService.declareHoliday(body, req.user);
      sendCreated(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async deleteHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const result = await holidayService.deleteHoliday(req.params.id as string, req.user);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async getHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, startDate, endDate, batchId } = req.query;
      const data = await holidayService.getHolidays({
        date: date as string,
        startDate: startDate as string,
        endDate: endDate as string,
        batchId: batchId as string,
      });
      sendSuccess(res, data, "Holidays retrieved successfully");
    } catch (err) {
      next(err);
    }
  }
}

export const holidayController = new HolidayController();
