import { Router } from "express";
import { roomController } from "../controllers/room.controller.js";
import { optionalAuthenticate } from "../middleware/auth.js";

const roomRouter = Router();

roomRouter.get("/availability", optionalAuthenticate, (req, res, next) => {
  roomController.getRoomAvailability(req, res, next);
});

roomRouter.get("/schedule", optionalAuthenticate, (req, res, next) => {
  roomController.getScheduleGrid(req, res, next);
});

roomRouter.get("/", optionalAuthenticate, (req, res, next) => {
  roomController.getAllRooms(req, res, next);
});

export { roomRouter };
