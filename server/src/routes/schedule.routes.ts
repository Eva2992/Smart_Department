import { Router } from "express";
import rateLimit from "express-rate-limit";
import { scheduleController } from "../controllers/schedule.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { authorize, requireChairman } from "../middleware/rbac.js";
import { Role } from "@prisma/client";

const scheduleRouter = Router();
const scheduleWriteLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// Conflict checking can be checked interactively with optional or required auth
scheduleRouter.post("/check-conflict", optionalAuthenticate, (req, res, next) => {
  scheduleController.checkConflict(req, res, next);
});

scheduleRouter.post(
  "/seminar",
  scheduleWriteLimiter,
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN, Role.CR),
  (req, res, next) => {
    scheduleController.createSeminar(req, res, next);
  }
);

// Create ad-hoc or makeup schedule entry
scheduleRouter.post(
  "/",
  scheduleWriteLimiter,
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN, Role.CR),
  (req, res, next) => {
    scheduleController.createScheduleEntry(req, res, next);
  }
);

// Get schedule list (public or authenticated)
scheduleRouter.get("/", optionalAuthenticate, (req, res, next) => {
  scheduleController.getSchedule(req, res, next);
});

// Get personal schedule (requires auth)
scheduleRouter.get("/me", authenticate, (req, res, next) => {
  scheduleController.getMySchedule(req, res, next);
});

// Class count tracking (SN-05, TN-10)
scheduleRouter.get("/class-count", authenticate, (req, res, next) => {
  scheduleController.getClassCounts(req, res, next);
});

// Class change requests (FR-17, FR-18)
scheduleRouter.get("/change-requests", authenticate, (req, res, next) => {
  scheduleController.getChangeRequests(req, res, next);
});

scheduleRouter.patch(
  "/change-requests/:requestId",
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN),
  (req, res, next) => {
    scheduleController.reviewChangeRequest(req, res, next);
  }
);

// Get single schedule entry
scheduleRouter.get("/:id", optionalAuthenticate, (req, res, next) => {
  scheduleController.getScheduleById(req, res, next);
});

// Student/CR submit class change request (FR-17, FR-18)
scheduleRouter.post(
  "/:id/requests",
  scheduleWriteLimiter,
  authenticate,
  authorize(Role.STUDENT, Role.CR),
  (req, res, next) => {
    scheduleController.submitChangeRequest(req, res, next);
  }
);

// Get suggested slots for class reassignment to another day (FR-19)
scheduleRouter.get("/:id/suggested-slots", optionalAuthenticate, (req, res, next) => {
  scheduleController.getSuggestedSlots(req, res, next);
});

// Reschedule a class (Teacher of class, Admin, or CR)
scheduleRouter.patch(
  "/:id/reschedule",
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN, Role.CR),
  (req, res, next) => {
    scheduleController.rescheduleClass(req, res, next);
  }
);

// Update class time on same day
scheduleRouter.patch(
  "/:id/time",
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN, Role.CR),
  (req, res, next) => {
    scheduleController.updateClassTime(req, res, next);
  }
);

// Cancel a class (Both PATCH and POST are supported for client compatibility)
scheduleRouter.patch(
  "/:id/cancel",
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN, Role.CR),
  (req, res, next) => {
    scheduleController.cancelClass(req, res, next);
  }
);

scheduleRouter.post(
  "/:id/cancel",
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN, Role.CR),
  (req, res, next) => {
    scheduleController.cancelClass(req, res, next);
  }
);

export { scheduleRouter };
