import { Router } from "express";
import { routineController } from "../controllers/routine.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authorize } from "../middleware/rbac.js";
import { Role } from "@prisma/client";

const routineRouter = Router();

// Generate routine for a semester (Admin only)
routineRouter.post("/generate", authenticate, authorize(Role.ADMIN), (req, res, next) => {
  routineController.generateRoutine(req, res, next);
});

export { routineRouter };
