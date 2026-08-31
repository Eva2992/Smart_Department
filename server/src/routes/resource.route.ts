import { Router } from "express";
import { resourceController } from "../controllers/resource.controller.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { resourceUpload } from "../config/upload.js";
import { Role } from "@prisma/client";

const resourceRouter = Router();

// Public: Category hierarchy tree
resourceRouter.get("/hierarchy", (req, res, next) => {
  resourceController.getHierarchy(req, res).catch(next);
});

// Public: List and search resources
resourceRouter.get("/", (req, res, next) => {
  resourceController.listResources(req, res).catch(next);
});

// Public: Download resource & increment counter
resourceRouter.get("/:id/download", (req, res, next) => {
  resourceController.downloadResource(req, res).catch(next);
});

// Public: Get single resource details
resourceRouter.get("/:id", (req, res, next) => {
  resourceController.getResourceById(req, res).catch(next);
});

// CR / Admin: Upload new study resource
resourceRouter.post(
  "/",
  authenticate,
  authorize(Role.CR, Role.ADMIN),
  resourceUpload.single("file"),
  (req, res, next) => {
    resourceController.uploadResource(req, res).catch(next);
  }
);

// CR / Admin: Delete study resource
resourceRouter.delete("/:id", authenticate, authorize(Role.CR, Role.ADMIN), (req, res, next) => {
  resourceController.deleteResource(req, res).catch(next);
});

export { resourceRouter };
