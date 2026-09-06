/**
 * Resource Router — FR-23: Study Resource Repository.
 *
 * Defines Express routes for study resource and result archive operations:
 *
 * | Method | Path              | Auth      | Description                                    |
 * |--------|-------------------|-----------|------------------------------------------------|
 * | GET    | `/hierarchy`      | Public    | Category navigation tree (Year→Semester→Course).|
 * | GET    | `/`               | Public    | List and search resources with pagination.     |
 * | GET    | `/:id/download`   | Public    | Download resource file & increment counter.    |
 * | GET    | `/:id`            | Public    | Get single resource metadata.                  |
 * | POST   | `/`               | CR, Admin | Upload a new study resource (multipart).       |
 * | DELETE | `/:id`            | CR, Admin | Delete a resource (owner or Admin).            |
 *
 * @see {@link ResourceController} for endpoint handler implementations.
 * @see {@link resourceService} for business logic.
 * @module routes/resource
 */

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
