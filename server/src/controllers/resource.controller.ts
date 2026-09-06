/**
 * Resource Controller — thin HTTP adapter for {@link resourceService}.
 *
 * Handles request deserialization, Zod validation, multer file processing,
 * response formatting, and RBAC guard checks for study resource and
 * result archive endpoints.
 *
 * Implements:
 * - **FR-23**: Study Resource Repository (upload, list, download, delete).
 * - **ADR-0004 §3**: Resource archive access for dual-hybrid result storage.
 *
 * @see {@link resourceService} for business logic.
 * @see {@link resourceRouter} for route definitions.
 * @module controllers/resource
 */

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

/**
 * Express controller class for study resource operations.
 *
 * All methods are thin HTTP adapters that validate input via Zod schemas,
 * delegate to {@link resourceService}, and format standardized JSON responses.
 */
export class ResourceController {
  /**
   * Uploads a new study resource with file validation and metadata persistence.
   *
   * Expects a multipart form upload with a `file` field (handled by multer middleware)
   * and JSON metadata fields validated against {@link uploadResourceMetadataSchema}.
   * After successful upload, triggers non-blocking batch notifications (FR-31).
   *
   * Authorized for CR or Admin only.
   *
   * @param req - Express request with authenticated user, multer file, and metadata body.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   * @throws {AppError} `FILE_REQUIRED` (400) if no file is attached to the request.
   *
   * @example
   * ```
   * POST /api/v1/resources
   * Authorization: Bearer <cr-or-admin-token>
   * Content-Type: multipart/form-data
   * Body: file=<binary>, title="Lecture 3", courseName="CSE 401", ...
   * ```
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
   * Lists study resources with search, filter, and pagination.
   *
   * Public endpoint — validates query parameters against {@link resourceQuerySchema}
   * and delegates to {@link resourceService.listResources}.
   *
   * @param req - Express request with query parameters.
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/resources?year=2026&type=SLIDE&search=Software&page=1&limit=20
   * ```
   */
  async listResources(req: Request, res: Response): Promise<void> {
    const validatedQuery = resourceQuerySchema.parse(req.query);
    const data = await resourceService.listResources(validatedQuery);

    sendSuccess(res, data, "Resources retrieved successfully");
  }

  /**
   * Fetches single resource metadata by its UUID.
   *
   * Public endpoint — validates the `id` path parameter and delegates
   * to {@link resourceService.getResourceById}.
   *
   * @param req - Express request with `id` path parameter.
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/resources/resource-uuid
   * ```
   */
  async getResourceById(req: Request, res: Response): Promise<void> {
    const { id } = resourceIdParamSchema.parse(req.params);
    const resource = await resourceService.getResourceById(id);

    sendSuccess(res, resource, "Resource retrieved successfully");
  }

  /**
   * Downloads a resource file and atomically increments the download counter.
   *
   * Public endpoint — supports content negotiation:
   * - If `?json=true` or `Accept: application/json`, returns the updated resource as JSON.
   * - Otherwise, streams the physical file from disk as a download attachment.
   * - Falls back to JSON response if the file is missing on disk (e.g. seeded/mock data).
   *
   * @param req - Express request with `id` path parameter and optional `json` query flag.
   * @param res - Express response (file download or JSON).
   *
   * @example
   * ```
   * GET /api/v1/resources/resource-uuid/download
   * GET /api/v1/resources/resource-uuid/download?json=true
   * ```
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
   * Deletes a resource from database and storage.
   *
   * Authorized for the original CR uploader or Admin only.
   * Delegates to {@link resourceService.deleteResource} for ownership
   * validation and physical file cleanup.
   *
   * @param req - Express request with authenticated user and `id` path parameter.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   *
   * @example
   * ```
   * DELETE /api/v1/resources/resource-uuid
   * Authorization: Bearer <cr-or-admin-token>
   * ```
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
   * Returns the hierarchical resource category navigation tree.
   *
   * Public endpoint — delegates to {@link resourceService.getHierarchy} to build
   * the Year → Semester → Course → Types drill-down structure.
   *
   * @param _req - Express request (unused).
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/resources/hierarchy
   * ```
   */
  async getHierarchy(_req: Request, res: Response): Promise<void> {
    const hierarchy = await resourceService.getHierarchy();
    sendSuccess(res, hierarchy, "Resource hierarchy retrieved successfully");
  }
}

export const resourceController = new ResourceController();
