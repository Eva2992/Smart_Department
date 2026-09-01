import type { Request, Response, NextFunction } from "express";
import { scheduleService } from "../services/scheduleService.js";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { normalizeDateString } from "../utils/timeUtils.js";
import { AppError } from "../middleware/errorHandler.js";

export class RoomController {
  async getRoomAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = (req.query.date as string) || normalizeDateString(new Date());
      const roomId = req.query.roomId as string | undefined;
      const data = await scheduleService.getRoomAvailability(date, roomId);
      sendSuccess(res, data, "Room availability matrix retrieved");
    } catch (err) {
      next(err);
    }
  }

  async getAllRooms(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await prisma.room.findMany({
        orderBy: { roomNumber: "asc" },
      });
      sendSuccess(res, data, "Rooms retrieved successfully");
    } catch (err) {
      next(err);
    }
  }
  /**
   * Retrieves the multi-day room schedule grid for the Room Availability Matrix.
   *
   * @param req - Express request with query params `startDate` and `endDate` (YYYY-MM-DD)
   * @param res - Express response
   * @param next - Express next function for error propagation
   *
   * @example
   * GET /api/v1/rooms/schedule?startDate=2026-09-01&endDate=2026-09-04
   */
  async getScheduleGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate as string;
      let endDate = req.query.endDate as string;

      if (!startDate) {
        throw new AppError("startDate is required", 400, "BAD_REQUEST");
      }

      if (!endDate) {
        const start = new Date(normalizeDateString(startDate));
        start.setDate(start.getDate() + 4);
        endDate = normalizeDateString(start);
      }

      const data = await scheduleService.getAllRoomsSchedule(startDate, endDate);
      sendSuccess(res, data, "Room schedule grid retrieved");
    } catch (err) {
      next(err);
    }
  }
}

export const roomController = new RoomController();
