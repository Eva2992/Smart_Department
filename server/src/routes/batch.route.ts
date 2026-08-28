import { Router } from "express";
import { batchController } from "../controllers/batch.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";

const batchRouter = Router();

// Public / Authenticated batch querying
batchRouter.get("/", (req, res, next) => {
  batchController.getBatches(req, res).catch(next);
});

batchRouter.get("/:id", (req, res, next) => {
  batchController.getBatchById(req, res).catch(next);
});

// Admin-only creation
batchRouter.post("/", authenticate, authorize("ADMIN"), (req, res, next) => {
  batchController.createBatch(req, res).catch(next);
});

export { batchRouter };
