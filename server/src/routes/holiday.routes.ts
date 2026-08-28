import { Router } from "express";
import { holidayController } from "../controllers/holiday.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import { Role } from "@prisma/client";

const holidayRouter = Router();

// List holidays
holidayRouter.get("/", optionalAuthenticate, (req, res, next) => {
  holidayController.getHolidays(req, res, next);
});

// Declare holiday (Admin only)
holidayRouter.post("/", authenticate, authorize(Role.ADMIN), (req, res, next) => {
  holidayController.declareHoliday(req, res, next);
});

// Delete holiday (Admin only)
holidayRouter.delete("/:id", authenticate, authorize(Role.ADMIN), (req, res, next) => {
  holidayController.deleteHoliday(req, res, next);
});

export { holidayRouter };
