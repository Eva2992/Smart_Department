/**
 * Exam Router — FR-22: Semester Final Exam Routine Management
 *
 * Routes:
 *  POST   /api/v1/exams/routine          — Admin bulk-create exam entries
 *  GET    /api/v1/exams/routine          — Authenticated: list exam schedule
 *  GET    /api/v1/exams/routine/:id      — Authenticated: single exam entry
 *  PATCH  /api/v1/exams/routine/:id      — Admin update exam entry
 *  DELETE /api/v1/exams/routine/:id      — Admin cancel exam entry
 */

import { Router } from "express";
import { examController } from "../controllers/exam.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import { Role } from "@prisma/client";

const examRouter = Router();

// ── Public-ish: all authenticated users can view the exam schedule ─────────────

examRouter.get("/routine", authenticate, (req, res, next) => {
  examController.getExamSchedule(req, res).catch(next);
});

examRouter.get("/routine/:id", authenticate, (req, res, next) => {
  examController.getExamEntryById(req, res).catch(next);
});

// ── Admin-only: create / modify / cancel exam entries ─────────────────────────

examRouter.post(
  "/routine",
  authenticate,
  authorize(Role.ADMIN),
  (req, res, next) => {
    examController.createExamRoutine(req, res).catch(next);
  }
);

examRouter.patch(
  "/routine/:id",
  authenticate,
  authorize(Role.ADMIN),
  (req, res, next) => {
    examController.updateExamEntry(req, res).catch(next);
  }
);

examRouter.delete(
  "/routine/:id",
  authenticate,
  authorize(Role.ADMIN),
  (req, res, next) => {
    examController.cancelExamEntry(req, res).catch(next);
  }
);

export { examRouter };
