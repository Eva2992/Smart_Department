/**
 * Result Router — FR-25 (Result Upload by CR) & FR-26 (Public Result Page).
 *
 * Defines Express routes for semester final result operations:
 *
 * | Method | Path                                    | Auth       | Description                              |
 * |--------|-----------------------------------------|------------|------------------------------------------|
 * | POST   | `/upload`                               | CR, Admin  | Upload & publish semester final results. |
 * | GET    | `/query`                                | Public     | Search and filter published results.     |
 * | GET    | `/me`                                   | Auth       | Current student's own result history.    |
 * | GET    | `/student/:id`                          | Public     | Specific student's result history.       |
 * | GET    | `/batch/:batchId/semester/:semesterId`  | Public     | Batch semester analytics summary.        |
 *
 * @see {@link ResultController} for endpoint handler implementations.
 * @see {@link ResultService} for business logic.
 * @module routes/result
 */

import { Router } from "express";
import { resultController } from "../controllers/result.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { Role } from "@prisma/client";

const resultRouter = Router();

// Upload & publish semester final results (CR or ADMIN only)
resultRouter.post("/upload", authenticate, authorize(Role.CR, Role.ADMIN), (req, res, next) => {
  resultController.uploadResults(req, res).catch(next);
});

// Public result search and query
resultRouter.get("/query", (req, res, next) => {
  resultController.queryResults(req, res).catch(next);
});

// Authenticated student's own results
resultRouter.get("/me", authenticate, (req, res, next) => {
  resultController.getMyResults(req, res).catch(next);
});

// Individual student result history lookup (Public / Authenticated)
resultRouter.get("/student/:id", (req, res, next) => {
  resultController.getStudentResults(req, res).catch(next);
});

// Batch & semester summary and analytics
resultRouter.get("/batch/:batchId/semester/:semesterId", (req, res, next) => {
  resultController.getBatchSemesterSummary(req, res).catch(next);
});

export { resultRouter };
