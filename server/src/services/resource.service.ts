import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import type {
  UploadResourceInput,
  ResourceQueryFilter,
  PaginatedResourcesResponse,
  ResourceItem,
  ResourceHierarchyItem,
} from "../types/resource.js";
import { ResourceType, Role } from "@prisma/client";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
]);

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
]);

export interface UploadedFileInfo {
  filename: string;
  path: string;
  size: number;
  mimetype: string;
  originalname: string;
}

/**
 * Validates file size and format against SRS FR-23 constraints.
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
 * Uploads a study resource, creates database record, and links to uploader.
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

  return created as unknown as ResourceItem;
}

/**
 * Lists resources with pagination and multi-facet filtering.
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
 * Fetches a single resource by its unique identifier.
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
 * Atomically increments the download counter for a resource.
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
 * Deletes a resource from database and storage.
 * Enforces CR owner or Admin permission.
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
 * Builds the hierarchical category navigation tree (Year → Semester → Course → Types).
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
