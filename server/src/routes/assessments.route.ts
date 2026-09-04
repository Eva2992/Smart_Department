import { Router } from "express";
import { assessmentsController } from "../controllers/assessments.controller.js";
import { authenticate } from "../middleware/auth.js";
import { assignmentUpload } from "../config/upload.js";

/**
 * Express router for all assessment-related endpoints (CTs and Assignments).
 * Includes routes for scheduling CTs, managing assignments, and handling file submissions.
 */
const assessmentsRouter = Router();

// Static segments MUST come before dynamic :ctId to prevent Express swallowing "student" as a ctId
assessmentsRouter.get("/ct/student/:studentId", (req, res, next) => {
  assessmentsController.getStudentCTMarks(req, res).catch(next);
});

assessmentsRouter.post("/ct", (req, res, next) => {
  assessmentsController.scheduleCT(req, res).catch(next);
});

assessmentsRouter.patch("/ct/:ctId", (req, res, next) => {
  assessmentsController.updateCT(req, res).catch(next);
});

assessmentsRouter.delete("/ct/:ctId", (req, res, next) => {
  assessmentsController.cancelCT(req, res).catch(next);
});

assessmentsRouter.post("/assignments", (req, res, next) => {
  assessmentsController.createAssignment(req, res).catch(next);
});

assessmentsRouter.get("/assignments", (req, res, next) => {
  assessmentsController.listAssignments(req, res).catch(next);
});

assessmentsRouter.patch("/assignments/:assignmentId", (req, res, next) => {
  assessmentsController.updateAssignment(req, res).catch(next);
});

assessmentsRouter.delete("/assignments/:assignmentId", (req, res, next) => {
  assessmentsController.deleteAssignment(req, res).catch(next);
});

// Dual-mode assignment submissions (FR-21, ADR-0005)
assessmentsRouter.post(
  "/assignments/:id/submissions",
  authenticate,
  assignmentUpload.single("file"),
  (req, res, next) => {
    assessmentsController.submitAssignment(req, res).catch(next);
  }
);

assessmentsRouter.get("/assignments/:id/submissions", authenticate, (req, res, next) => {
  assessmentsController.getAssignmentSubmissions(req, res).catch(next);
});

export { assessmentsRouter };
