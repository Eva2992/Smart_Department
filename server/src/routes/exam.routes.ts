/**
 * Exam Router — FR-22: Semester Final Exam Routine Management.
 *
 * Defines Express routes for exam schedule operations:
 *
 * | Method | Path              | Auth  | Description                                   |
 * |--------|-------------------|-------|-----------------------------------------------|
 * | GET    | `/routine`        | Auth  | List exam schedule with filters & pagination. |
 * | GET    | `/routine/:id`    | Auth  | Retrieve a single exam entry by ID.           |
 * | POST   | `/routine`        | Admin | Bulk-create exam routine entries.              |
 * | PATCH  | `/routine/:id`    | Admin | Update an existing exam entry.                |
 * | DELETE | `/routine/:id`    | Admin | Cancel (soft-delete) an exam entry.           |
 *
 * @see {@link ExamController} for endpoint handler implementations.
 * @see {@link examService} for business logic.
 * @module routes/exam
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
