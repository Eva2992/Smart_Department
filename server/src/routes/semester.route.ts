import { Router } from "express";
import { semesterController } from "../controllers/semester.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const semesterRouter = Router();

// Read operations: Authenticated users
semesterRouter.get("/", authenticate, (req, res, next) => {
  semesterController.getSemesters(req, res).catch(next);
});

semesterRouter.get("/teachers/list", authenticate, (req, res, next) => {
  semesterController.getTeachers(req, res).catch(next);
});

semesterRouter.get("/:id", authenticate, (req, res, next) => {
  semesterController.getSemesterById(req, res).catch(next);
});

// Admin-only operations
semesterRouter.post("/", authenticate, authorize("ADMIN"), (req, res, next) => {
  semesterController.createSemester(req, res).catch(next);
});

semesterRouter.patch("/:id", authenticate, authorize("ADMIN"), (req, res, next) => {
  semesterController.updateSemester(req, res).catch(next);
});

// Course management on semester (Admin or CR)
semesterRouter.post("/:id/courses", authenticate, authorize("ADMIN", "CR"), (req, res, next) => {
  semesterController.addCourse(req, res).catch(next);
});

semesterRouter.delete("/:id/courses/:courseId", authenticate, authorize("ADMIN", "CR"), (req, res, next) => {
  semesterController.deleteCourse(req, res).catch(next);
});

export { semesterRouter };
