import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { holidayService } from "../services/holidayService.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

const declareHolidaySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    reason: z.string().min(1, "Holiday reason is required"),
    scope: z.enum(["ALL", "BATCH"]).optional(),
    batchId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.scope === "BATCH" && !data.batchId) {
        return false;
      }
      return true;
    },
    {
      message: "batchId is required when holiday scope is BATCH.",
      path: ["batchId"],
    }
  );

const updateHolidaySchema = z.object({
  date: z.string().optional(),
  reason: z.string().min(1).optional(),
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

  async updateHoliday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = updateHolidaySchema.parse(req.body);
      const result = await holidayService.updateHoliday(req.params.id as string, body, req.user);
      sendSuccess(res, result, result.message);
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

  async getUpcomingHolidays(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5;
      const batchId = req.query.batchId as string | undefined;
      const data = await holidayService.getUpcomingHolidays(limit, batchId);
      sendSuccess(res, data, "Upcoming holidays retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  async checkHolidayDate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, batchId } = req.query;
      if (!date) {
        throw new AppError("date query parameter is required", 400, "VALIDATION_ERROR");
      }
      const isHoliday = await holidayService.isHolidayDate(
        date as string,
        batchId as string | undefined
      );
      sendSuccess(res, { isHoliday }, "Holiday status checked successfully");
    } catch (err) {
      next(err);
    }
  }
}

export const holidayController = new HolidayController();

