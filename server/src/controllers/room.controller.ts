import type { Request, Response, NextFunction } from "express";
import { scheduleService } from "../services/scheduleService.js";
import { prisma } from "../lib/prisma.js";
import { sendSuccess } from "../utils/response.js";
import { normalizeDateString } from "../utils/timeUtils.js";

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
}

export const roomController = new RoomController();
