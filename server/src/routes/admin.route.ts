import { Router } from "express";
import { batchController } from "../controllers/batch.controller.js";
import { semesterController } from "../controllers/semester.controller.js";
import { promotionController } from "../controllers/promotion.controller.js";
import { studentController } from "../controllers/student.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const adminRouter = Router();

// Protect all admin endpoints with Admin role guard
adminRouter.use(authenticate, authorize("ADMIN"));

// Batches
adminRouter.post("/batches", (req, res, next) => {
  batchController.createBatch(req, res).catch(next);
});
adminRouter.get("/batches", (req, res, next) => {
  batchController.getBatches(req, res).catch(next);
});
adminRouter.get("/batches/:id", (req, res, next) => {
  batchController.getBatchById(req, res).catch(next);
});

// Semesters & Course Mapping
adminRouter.post("/semesters", (req, res, next) => {
  semesterController.createSemester(req, res).catch(next);
});
adminRouter.get("/semesters", (req, res, next) => {
  semesterController.getSemesters(req, res).catch(next);
});
adminRouter.get("/semesters/:id", (req, res, next) => {
  semesterController.getSemesterById(req, res).catch(next);
});
adminRouter.patch("/semesters/:id", (req, res, next) => {
  semesterController.updateSemester(req, res).catch(next);
});

// Promotion Lifecycle & CR Assignment
adminRouter.post("/batches/:id/promote", (req, res, next) => {
  promotionController.promoteBatch(req, res).catch(next);
});
adminRouter.patch("/batches/:id/cr", (req, res, next) => {
  studentController.assignCR(req, res).catch(next);
});
adminRouter.get("/promotions", (req, res, next) => {
  promotionController.getPromotionRequests(req, res).catch(next);
});
adminRouter.patch("/promotions/:id/reject", (req, res, next) => {
  promotionController.rejectPromotion(req, res).catch(next);
});

// Students & Semester Overrides (FR-09)
adminRouter.get("/students", (req, res, next) => {
  studentController.searchStudents(req, res).catch(next);
});
adminRouter.patch("/students/:id/semester-override", (req, res, next) => {
  studentController.overrideSemester(req, res).catch(next);
});
adminRouter.patch("/students/:id/semester", (req, res, next) => {
  studentController.overrideSemester(req, res).catch(next);
});

export { adminRouter };
