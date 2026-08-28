import { Router } from "express";
import { assessmentsController } from "../controllers/assessments.controller.js";

const assessmentsRouter = Router();

assessmentsRouter.post("/ct", (req, res, next) => {
  assessmentsController.scheduleCT(req, res).catch(next);
});

assessmentsRouter.post("/ct/:ctId", (req, res, next) => {
  assessmentsController.updateCT(req, res).catch(next);
});

assessmentsRouter.delete("/ct/:ctId", (req, res, next) => {
  assessmentsController.cancelCT(req, res).catch(next);
});

assessmentsRouter.get("/ct/student/:studentId", (req, res, next) => {
  assessmentsController.getStudentCTMarks(req, res).catch(next);
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

export { assessmentsRouter };
