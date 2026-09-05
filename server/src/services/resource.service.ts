/**
 * Resource Service — Study Material & Result Archive Management.
 *
 * Provides the business logic layer for uploading, listing, downloading,
 * and deleting study resources (lecture slides, notes, question banks)
 * and archived semester result grade sheets.
 *
 * Implements:
 * - **FR-23**: Study Resource Repository with file validation (size ≤ 50 MB,
 *   supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG).
 * - **ADR-0004 §3**: Dual-Hybrid Result Storage — raw result documents are
 *   archived in this {@link Resource} repository alongside study materials
 *   for unified full-batch download.
 * - **FR-31**: Notification dispatch after resource upload (non-blocking).
 *
 * @see {@link ResourceItem} for the client-facing DTO structure.
 * @see {@link ResultService.publishResult} for result-side dual-hybrid integration.
 * @module services/resource
 */

import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { auditService } from "./audit.service.js";
import type {
  UploadResourceInput,
  ResourceQueryFilter,
  PaginatedResourcesResponse,
  ResourceItem,
  ResourceHierarchyItem,
} from "../types/resource.js";
import { ResourceType, Role } from "@prisma/client";
import { notificationService, NotificationType } from "./notification.service.js";

/**
 * Maximum allowed file size for resource uploads (50 MB).
 *
 * Enforced during file validation per SRS FR-23.
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Set of allowed file extensions for resource uploads.
 *
 * Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG/JPEG.
 */
export const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
]);

/**
 * Set of allowed MIME types for resource uploads.
 *
 * Mirrors {@link ALLOWED_EXTENSIONS} for dual validation (extension + MIME).
 */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

/**
 * Metadata for an uploaded file as provided by multer middleware.
 *
 * Used by {@link validateResourceFile} and {@link uploadResource}
 * to process the physical file alongside its metadata.
 */
export interface UploadedFileInfo {
  /** Generated filename on disk (from multer). */
  filename: string;

  /** Full disk path to the uploaded file. */
  path: string;

  /** File size in bytes. */
  size: number;

  /** MIME type detected by multer. */
  mimetype: string;

  /** Original filename from the client upload. */
  originalname: string;
}

/**
 * Validates a file against SRS FR-23 size and format constraints.
 *
 * Checks both file size (≤ 50 MB) and format (extension or MIME type must
 * match the allowed sets). Either a valid extension or a valid MIME type
 * is sufficient to pass format validation.
 *
 * @param file - Uploaded file metadata from multer.
 * @throws {AppError} `FILE_TOO_LARGE` (400) if file exceeds {@link MAX_FILE_SIZE_BYTES}.
 * @throws {AppError} `INVALID_FILE_TYPE` (400) if neither extension nor MIME type is supported.
 *
 * @example
 * ```ts
 * validateResourceFile({
 *   filename: "abc123.pdf",
 *   path: "/uploads/resources/abc123.pdf",
 *   size: 1024 * 1024, // 1 MB
 *   mimetype: "application/pdf",
 *   originalname: "lecture_notes.pdf",
 * });
 * // No error thrown — file is valid.
 * ```
 */
export function validateResourceFile(file: UploadedFileInfo): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AppError(
      `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 50 MB limit`,
      400,
      "FILE_TOO_LARGE"
    );
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const isExtensionValid = ALLOWED_EXTENSIONS.has(ext);
  const isMimeValid = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (!isExtensionValid && !isMimeValid) {
    throw new AppError(
      `Unsupported file type '${ext || file.mimetype}'. Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG.`,
      400,
      "INVALID_FILE_TYPE"
    );
  }
}

/**
 * Uploads a study resource: validates the file, creates a database record,
 * and logs an audit trail entry.
 *
 * The file URL is constructed from the multer-generated filename and stored
 * as a relative path under `/uploads/resources/`.
 *
 * @param metadata - Validated resource metadata (title, course, semester, year, type).
 * @param file - Uploaded file info from multer middleware.
 * @param uploaderId - UUID of the authenticated user performing the upload.
 * @returns Created {@link ResourceItem} DTO with uploader profile.
 * @throws {AppError} `FILE_TOO_LARGE` (400) if file exceeds 50 MB.
 * @throws {AppError} `INVALID_FILE_TYPE` (400) if file format is unsupported.
 *
 * @example
 * ```ts
 * const resource = await uploadResource(
 *   { title: "AI Lecture 3", courseName: "CSE 401", semesterLabel: "4Y1S", year: 2026, type: "SLIDE" },
 *   { filename: "abc.pdf", path: "/uploads/resources/abc.pdf", size: 2048, mimetype: "application/pdf", originalname: "lecture3.pdf" },
 *   "user-uuid"
 * );
 * ```
 */
export async function uploadResource(
  metadata: UploadResourceInput,
  file: UploadedFileInfo,
  uploaderId: string
): Promise<ResourceItem> {
  validateResourceFile(file);

  const fileUrl = `/uploads/resources/${path.basename(file.path || file.filename)}`;

  const created = await prisma.resource.create({
    data: {
      title: metadata.title,
      courseName: metadata.courseName,
      semesterLabel: metadata.semesterLabel,
      year: metadata.year,
      type: metadata.type,
      fileUrl,
      fileSizeBytes: file.size,
      uploaderId,
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  await auditService.logAction({
    userId: uploaderId,
    action: "RESOURCE_UPLOAD",
    entityType: "RESOURCE",
    entityId: created.id,
    details: { title: created.title, type: created.type },
  });

  return created as unknown as ResourceItem;
}

/**
 * Dispatches batch-wide notifications for a newly uploaded resource (FR-31).
 *
 * Resolves all active semesters matching the resource's `semesterLabel`,
 * then sends a notification to every student in the corresponding batches.
 * Called asynchronously after {@link uploadResource} succeeds; notification
 * failures do not propagate to the upload response.
 *
 * @param resource - The newly created {@link ResourceItem} to notify about.
 *
 * @example
 * ```ts
 * await notifyResourceUpload(createdResource);
 * // Students in matching batches receive "New resource uploaded: ..." notification.
 * ```
 */
export async function notifyResourceUpload(resource: ResourceItem) {
  // Find users in batches whose current semester matches the resource's semesterLabel
  const semesters = await prisma.semester.findMany({
    where: {
      name: { contains: resource.semesterLabel, mode: "insensitive" },
      status: "ACTIVE",
    },
    select: { batchId: true },
  });

  const batchIds = [...new Set(semesters.map((s) => s.batchId))];

  for (const batchId of batchIds) {
    await notificationService.createBulkForBatch(
      batchId,
      NotificationType.RESOURCE_UPLOADED,
      `New resource uploaded: "${resource.title}" for ${resource.courseName}`,
      "Resource",
      resource.id
    );
  }
}

/**
 * Lists resources with pagination and multi-facet filtering.
 *
 * Supports filtering by year, semester label, course name, resource type,
 * and free-text search across title, course name, and semester label.
 * Results are ordered by creation date descending (newest first).
 *
 * @param filter - Query parameters from {@link ResourceQueryFilter}.
 * @returns Paginated response with {@link ResourceItem} array and pagination metadata.
 *
 * @example
 * ```ts
 * const data = await listResources({
 *   year: 2026,
 *   type: "SLIDE",
 *   search: "Software Engineering",
 *   page: 1,
 *   limit: 20,
 * });
 * // data.resources — array of ResourceItem DTOs
 * // data.pagination — { total, page, limit, totalPages }
 * ```
 */
export async function listResources(
  filter: ResourceQueryFilter
): Promise<PaginatedResourcesResponse> {
  const page = Math.max(1, filter.page ?? 1);
  const limit = Math.min(100, Math.max(1, filter.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};

  if (filter.year !== undefined) {
    where.year = filter.year;
  }

  if (filter.semesterLabel) {
    where.semesterLabel = {
      contains: filter.semesterLabel,
      mode: "insensitive",
    };
  }

  if (filter.courseName) {
    where.courseName = {
      contains: filter.courseName,
      mode: "insensitive",
    };
  }

  if (filter.type) {
    where.type = filter.type;
  }

  if (filter.search) {
    where.OR = [
      { title: { contains: filter.search, mode: "insensitive" } },
      { courseName: { contains: filter.search, mode: "insensitive" } },
      { semesterLabel: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  const [resources, total] = await Promise.all([
    prisma.resource.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    }),
    prisma.resource.count({ where }),
  ]);

  return {
    resources: resources as unknown as ResourceItem[],
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Fetches a single resource by its unique UUID.
 *
 * @param id - Resource UUID.
 * @returns The matching {@link ResourceItem} DTO with uploader profile.
 * @throws {AppError} `RESOURCE_NOT_FOUND` (404) if no resource exists with the given ID.
 *
 * @example
 * ```ts
 * const resource = await getResourceById("resource-uuid");
 * // resource.title, resource.fileUrl, resource.downloadCount, etc.
 * ```
 */
export async function getResourceById(id: string): Promise<ResourceItem> {
  const resource = await prisma.resource.findUnique({
    where: { id },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  if (!resource) {
    throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");
  }

  return resource as unknown as ResourceItem;
}

/**
 * Atomically increments the download counter for a resource and returns the updated record.
 *
 * Uses Prisma's `increment` operator for atomic, race-condition-safe counting.
 *
 * @param id - Resource UUID to increment.
 * @returns Updated {@link ResourceItem} DTO with the new `downloadCount`.
 * @throws {AppError} `RESOURCE_NOT_FOUND` (404) if no resource exists with the given ID.
 *
 * @example
 * ```ts
 * const updated = await incrementDownloadCount("resource-uuid");
 * // updated.downloadCount === previousCount + 1
 * ```
 */
export async function incrementDownloadCount(id: string): Promise<ResourceItem> {
  const existing = await prisma.resource.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");
  }

  const updated = await prisma.resource.update({
    where: { id },
    data: {
      downloadCount: { increment: 1 },
    },
    include: {
      uploader: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });

  return updated as unknown as ResourceItem;
}

/**
 * Deletes a resource from the database and removes the physical file from disk.
 *
 * Enforces ownership-based access control: only the original uploader (CR) or
 * an Admin may delete a resource. Physical file deletion is best-effort — if
 * the file does not exist on disk, the error is silently ignored.
 *
 * @param id - Resource UUID to delete.
 * @param userId - UUID of the authenticated user requesting deletion.
 * @param userRole - Role string of the requesting user (for Admin bypass).
 * @throws {AppError} `RESOURCE_NOT_FOUND` (404) if no resource exists with the given ID.
 * @throws {AppError} `FORBIDDEN` (403) if the user is neither the uploader nor an Admin.
 *
 * @example
 * ```ts
 * await deleteResource("resource-uuid", "user-uuid", "CR");
 * // Resource deleted from database and file removed from /uploads/resources/
 * ```
 */
export async function deleteResource(id: string, userId: string, userRole: string): Promise<void> {
  const resource = await prisma.resource.findUnique({ where: { id } });

  if (!resource) {
    throw new AppError("Resource not found", 404, "RESOURCE_NOT_FOUND");
  }

  const isOwner = resource.uploaderId === userId;
  const isAdmin = userRole === Role.ADMIN || userRole === "ADMIN";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      "Forbidden: You can only delete resources that you uploaded",
      403,
      "FORBIDDEN"
    );
  }

  // Attempt physical file deletion from disk
  if (resource.fileUrl.startsWith("/uploads/resources/")) {
    const filename = path.basename(resource.fileUrl);
    const diskPath = path.join(process.cwd(), "uploads", "resources", filename);
    try {
      await fs.unlink(diskPath);
    } catch {
      // Ignored if file doesn't exist on disk
    }
  }

  await prisma.resource.delete({ where: { id } });
}

/**
 * Builds the hierarchical category navigation tree for the resource browser.
 *
 * Aggregates all resources into a Year → Semester → Course → Types structure,
 * including resource counts per course. Used by the frontend to render
 * drill-down navigation for browsing study materials.
 *
 * @returns Array of {@link ResourceHierarchyItem} nodes ordered by year descending.
 *
 * @example
 * ```ts
 * const tree = await getHierarchy();
 * // tree[0].year = 2026
 * // tree[0].semesters[0].semesterLabel = "4th Year 1st Semester"
 * // tree[0].semesters[0].courses[0] = { courseName: "SE", types: ["SLIDE","NOTE"], count: 5 }
 * ```
 */
export async function getHierarchy(): Promise<ResourceHierarchyItem[]> {
  const resources = await prisma.resource.findMany({
    select: {
      year: true,
      semesterLabel: true,
      courseName: true,
      type: true,
    },
    orderBy: [{ year: "desc" }, { semesterLabel: "asc" }, { courseName: "asc" }],
  });

  const yearMap = new Map<
    number,
    Map<string, Map<string, { types: Set<ResourceType>; count: number }>>
  >();

  for (const r of resources) {
    if (!yearMap.has(r.year)) {
      yearMap.set(r.year, new Map());
    }
    const semesterMap = yearMap.get(r.year)!;

    if (!semesterMap.has(r.semesterLabel)) {
      semesterMap.set(r.semesterLabel, new Map());
    }
    const courseMap = semesterMap.get(r.semesterLabel)!;

    if (!courseMap.has(r.courseName)) {
      courseMap.set(r.courseName, { types: new Set(), count: 0 });
    }
    const courseEntry = courseMap.get(r.courseName)!;
    courseEntry.types.add(r.type);
    courseEntry.count += 1;
  }

  const hierarchy: ResourceHierarchyItem[] = [];

  for (const [year, semesterMap] of yearMap.entries()) {
    const semesters = [];
    for (const [semesterLabel, courseMap] of semesterMap.entries()) {
      const courses = [];
      for (const [courseName, data] of courseMap.entries()) {
        courses.push({
          courseName,
          types: Array.from(data.types),
          count: data.count,
        });
      }
      semesters.push({ semesterLabel, courses });
    }
    hierarchy.push({ year, semesters });
  }

  return hierarchy;
}

export const resourceService = {
  uploadResource,
  listResources,
  getResourceById,
  incrementDownloadCount,
  deleteResource,
  getHierarchy,
};
