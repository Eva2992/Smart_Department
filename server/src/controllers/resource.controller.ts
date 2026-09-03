import type { Request, Response } from "express";
import path from "node:path";
import fs from "node:fs";
import { resourceService, notifyResourceUpload } from "../services/resource.service.js";
import {
  uploadResourceMetadataSchema,
  resourceQuerySchema,
  resourceIdParamSchema,
} from "../validators/resource.validator.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

export class ResourceController {
  /**
   * Uploads a new study resource (CR or Admin).
   */
  async uploadResource(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    if (!req.file) {
      throw new AppError("No file uploaded. A document file is required.", 400, "FILE_REQUIRED");
    }

    const validatedMetadata = uploadResourceMetadataSchema.parse(req.body);

    const resource = await resourceService.uploadResource(
      validatedMetadata,
      {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname,
      },
      req.user.userId
    );

    // FR-31: Trigger notifications for students of the relevant semester
    notifyResourceUpload(resource).catch(() => {
      // Non-blocking: notification failure should not fail the upload
    });

    sendCreated(res, resource, "Study resource uploaded successfully");
  }

  /**
   * Lists study resources with search, filter, and pagination (Public).
   */
  async listResources(req: Request, res: Response): Promise<void> {
    const validatedQuery = resourceQuerySchema.parse(req.query);
    const data = await resourceService.listResources(validatedQuery);

    sendSuccess(res, data, "Resources retrieved successfully");
  }

  /**
   * Fetches single resource metadata by ID (Public).
   */
  async getResourceById(req: Request, res: Response): Promise<void> {
    const { id } = resourceIdParamSchema.parse(req.params);
    const resource = await resourceService.getResourceById(id);

    sendSuccess(res, resource, "Resource retrieved successfully");
  }

  /**
   * Downloads a resource file and atomically increments the download count (Public).
   */
  async downloadResource(req: Request, res: Response): Promise<void> {
    const { id } = resourceIdParamSchema.parse(req.params);
    const resource = await resourceService.incrementDownloadCount(id);

    // If client requested JSON response
    const wantsJson =
      req.query.json === "true" ||
      (req.headers.accept &&
        req.headers.accept.includes("application/json") &&
        !req.headers.accept.includes("text/html"));

    if (wantsJson) {
      sendSuccess(res, resource, "Download count incremented");
      return;
    }

    // Direct file download
    const filename = path.basename(resource.fileUrl);
    const diskPath = path.join(process.cwd(), "uploads", "resources", filename);

    if (fs.existsSync(diskPath)) {
      res.download(diskPath, `${resource.title}${path.extname(filename)}`);
      return;
    }

    // If file missing on disk (e.g. mock/seed), return JSON with URL
    sendSuccess(res, resource, "Resource file URL retrieved");
  }

  /**
   * Deletes a resource (CR uploader owner or Admin).
   */
  async deleteResource(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const { id } = resourceIdParamSchema.parse(req.params);
    await resourceService.deleteResource(id, req.user.userId, req.user.role);

    sendSuccess(res, null, "Resource deleted successfully");
  }

  /**
   * Returns hierarchical navigation tree (Public).
   */
  async getHierarchy(_req: Request, res: Response): Promise<void> {
    const hierarchy = await resourceService.getHierarchy();
    sendSuccess(res, hierarchy, "Resource hierarchy retrieved successfully");
  }
}

export const resourceController = new ResourceController();
