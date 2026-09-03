import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  getStudentDashboard,
  getTeacherDashboard,
  getAdminDashboard,
} from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

// All dashboard endpoints require authentication
dashboardRouter.use(authenticate);

// GET /api/v1/dashboard/student — RBAC: STUDENT, CR
dashboardRouter.get("/student", authorize("STUDENT", "CR"), getStudentDashboard);

// GET /api/v1/dashboard/teacher — RBAC: TEACHER
dashboardRouter.get("/teacher", authorize("TEACHER"), getTeacherDashboard);

// GET /api/v1/dashboard/admin — RBAC: ADMIN
dashboardRouter.get("/admin", authorize("ADMIN"), getAdminDashboard);

export { dashboardRouter };
