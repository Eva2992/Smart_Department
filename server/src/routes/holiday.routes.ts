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

// Upcoming holidays
holidayRouter.get("/upcoming", optionalAuthenticate, (req, res, next) => {
  holidayController.getUpcomingHolidays(req, res, next);
});

// Check if date is holiday
holidayRouter.get("/check", optionalAuthenticate, (req, res, next) => {
  holidayController.checkHolidayDate(req, res, next);
});

// Declare holiday or off-day (Admin or CR)
holidayRouter.post("/", authenticate, authorize(Role.ADMIN, Role.CR), (req, res, next) => {
  holidayController.declareHoliday(req, res, next);
});

// Update holiday or off-day (Admin or CR)
holidayRouter.patch("/:id", authenticate, authorize(Role.ADMIN, Role.CR), (req, res, next) => {
  holidayController.updateHoliday(req, res, next);
});

// Delete holiday or off-day (Admin or CR)
holidayRouter.delete("/:id", authenticate, authorize(Role.ADMIN, Role.CR), (req, res, next) => {
  holidayController.deleteHoliday(req, res, next);
});

export { holidayRouter };

