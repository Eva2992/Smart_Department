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
