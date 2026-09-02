import { Router } from "express";
import rateLimit from "express-rate-limit";
import { roomController } from "../controllers/room.controller.js";
import { optionalAuthenticate } from "../middleware/auth.js";

const roomRouter = Router();
const roomReadLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

roomRouter.get("/availability", roomReadLimiter, optionalAuthenticate, (req, res, next) => {
  roomController.getRoomAvailability(req, res, next);
});

roomRouter.get("/schedule", roomReadLimiter, optionalAuthenticate, (req, res, next) => {
  roomController.getScheduleGrid(req, res, next);
});

roomRouter.get("/", roomReadLimiter, optionalAuthenticate, (req, res, next) => {
  roomController.getAllRooms(req, res, next);
});

export { roomRouter };
