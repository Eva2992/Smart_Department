import { Router } from "express";
import { assessmentsController } from "../controllers/assessments.controller.js";
import { authenticate } from "../middleware/auth.js";
import { assignmentUpload } from "../config/upload.js";

/**
 * Express router handling assessment (CT and Assignment) endpoints.
 *
 * Implements Class Test scheduling, marks uploading, and Assignment workflows per SRS requirements:
 *
 * - `FR-19`: CT Scheduling integrated with conflict detection.
 * - `FR-20`: CT Marks Uploading and aggregation.
 * - `FR-21`: Assignment Creation and dual-mode submission handling (ADR-0005).
 * - `FR-27`: CT Marks View by Student dashboard.
 *
 * Route Table:
 *
 * - `GET /ct/student/:studentId`: Fetch aggregated CT marks for a student (delegates to {@link assessmentsController.getStudentCTMarks}).
 * - `POST /ct`: Schedule a new CT session (delegates to {@link assessmentsController.scheduleCT}).
 * - `PATCH /ct/:ctId`: Update an existing CT session (delegates to {@link assessmentsController.updateCT}).
 * - `DELETE /ct/:ctId`: Cancel a CT session (delegates to {@link assessmentsController.cancelCT}).
 * - `POST /assignments`: Create a new assignment (delegates to {@link assessmentsController.createAssignment}).
 * - `GET /assignments`: List all assignments for a batch (delegates to {@link assessmentsController.listAssignments}).
 * - `PATCH /assignments/:assignmentId`: Update assignment details (delegates to {@link assessmentsController.updateAssignment}).
 * - `DELETE /assignments/:assignmentId`: Delete an assignment (delegates to {@link assessmentsController.deleteAssignment}).
 * - `POST /assignments/:id/submissions`: Submit an assignment file or URL (protected by {@link authenticate}, delegates to {@link assessmentsController.submitAssignment}).
 * - `GET /assignments/:id/submissions`: View assignment submissions (protected by {@link authenticate}, delegates to {@link assessmentsController.getAssignmentSubmissions}).
 *
 * @see {@link assessmentsController}
 * @see {@link authenticate}
 *
 * @example
 * import { assessmentsRouter } from "./routes/assessments.route.js";
 * app.use("/api/v1/assessments", assessmentsRouter);
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
