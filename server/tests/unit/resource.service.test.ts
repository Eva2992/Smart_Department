import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/middleware/errorHandler.js";
import { ResourceType } from "@prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    resource: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: prismaMock,
}));

// Mock fs to prevent real file operations during unit test
vi.mock("node:fs/promises", () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
  },
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

import {
  uploadResource,
  listResources,
  getResourceById,
  incrementDownloadCount,
  deleteResource,
  getHierarchy,
} from "../../src/services/resource.service.js";

const baseResource = {
  id: "resource-1",
  title: "Lecture 1 Slides",
  courseName: "Software Engineering",
  semesterLabel: "4th Year 2nd Semester",
  year: 2026,
  type: ResourceType.SLIDES,
  fileUrl: "/uploads/resources/test-file.pdf",
  fileSizeBytes: 1024 * 1024 * 5, // 5 MB
  uploaderId: "user-cr-1",
  downloadCount: 10,
  createdAt: new Date("2026-08-20T10:00:00.000Z"),
  uploader: {
    id: "user-cr-1",
    name: "CR Rahim",
    role: "CR",
  },
};

describe("Resource Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadResource", () => {
    it("successfully creates a new resource record", async () => {
      prismaMock.resource.create.mockResolvedValue(baseResource);

      const result = await uploadResource(
        {
          title: "Lecture 1 Slides",
          courseName: "Software Engineering",
          semesterLabel: "4th Year 2nd Semester",
          year: 2026,
          type: ResourceType.SLIDES,
        },
        {
          filename: "test-file.pdf",
          path: "/uploads/resources/test-file.pdf",
          size: 1024 * 1024 * 5,
          mimetype: "application/pdf",
          originalname: "lecture1.pdf",
        },
        "user-cr-1"
      );

      expect(prismaMock.resource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: "Lecture 1 Slides",
            courseName: "Software Engineering",
            semesterLabel: "4th Year 2nd Semester",
            year: 2026,
            type: ResourceType.SLIDES,
            uploaderId: "user-cr-1",
          }),
        })
      );
      expect(result.id).toBe("resource-1");
      expect(result.title).toBe("Lecture 1 Slides");
    });

    it("rejects file upload exceeding 50 MB", async () => {
      const hugeSize = 51 * 1024 * 1024; // 51MB
      await expect(
        uploadResource(
          {
            title: "Large File",
            courseName: "Distributed Systems",
            semesterLabel: "4th Year 1st Semester",
            year: 2026,
            type: ResourceType.OTHER,
          },
          {
            filename: "huge.pdf",
            path: "/uploads/resources/huge.pdf",
            size: hugeSize,
            mimetype: "application/pdf",
            originalname: "huge.pdf",
          },
          "user-cr-1"
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "FILE_TOO_LARGE",
      });
    });

    it("rejects file with unsupported MIME/extension", async () => {
      await expect(
        uploadResource(
          {
            title: "Executable",
            courseName: "Security",
            semesterLabel: "4th Year 2nd Semester",
            year: 2026,
            type: ResourceType.OTHER,
          },
          {
            filename: "malware.exe",
            path: "/uploads/resources/malware.exe",
            size: 1024,
            mimetype: "application/x-msdownload",
            originalname: "malware.exe",
          },
          "user-cr-1"
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        code: "INVALID_FILE_TYPE",
      });
    });
  });

  describe("listResources", () => {
    it("returns paginated resource list with applied filters", async () => {
      prismaMock.resource.findMany.mockResolvedValue([baseResource]);
      prismaMock.resource.count.mockResolvedValue(1);

      const result = await listResources({
        year: 2026,
        type: ResourceType.SLIDES,
        search: "Lecture",
        page: 1,
        limit: 10,
      });

      expect(result.resources).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it("handles empty result sets gracefully", async () => {
      prismaMock.resource.findMany.mockResolvedValue([]);
      prismaMock.resource.count.mockResolvedValue(0);

      const result = await listResources({ page: 1, limit: 10 });
      expect(result.resources).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });
  });

  describe("getResourceById", () => {
    it("returns resource when found", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(baseResource);

      const result = await getResourceById("resource-1");
      expect(result.id).toBe("resource-1");
      expect(result.title).toBe("Lecture 1 Slides");
    });

    it("throws 404 when resource does not exist", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(null);

      await expect(getResourceById("non-existent")).rejects.toMatchObject({
        statusCode: 404,
        code: "RESOURCE_NOT_FOUND",
      });
    });
  });

  describe("incrementDownloadCount", () => {
    it("atomically increments the download counter and returns updated record", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(baseResource);
      prismaMock.resource.update.mockResolvedValue({
        ...baseResource,
        downloadCount: 11,
      });

      const result = await incrementDownloadCount("resource-1");
      expect(prismaMock.resource.update).toHaveBeenCalledWith({
        where: { id: "resource-1" },
        data: { downloadCount: { increment: 1 } },
        include: {
          uploader: {
            select: { id: true, name: true, role: true },
          },
        },
      });
      expect(result.downloadCount).toBe(11);
    });

    it("throws 404 if resource does not exist", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(null);

      await expect(incrementDownloadCount("non-existent")).rejects.toMatchObject({
        statusCode: 404,
        code: "RESOURCE_NOT_FOUND",
      });
    });
  });

  describe("deleteResource", () => {
    it("allows the CR who uploaded it to delete", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(baseResource);
      prismaMock.resource.delete.mockResolvedValue(baseResource);

      await deleteResource("resource-1", "user-cr-1", "CR");

      expect(prismaMock.resource.delete).toHaveBeenCalledWith({
        where: { id: "resource-1" },
      });
    });

    it("allows an Admin to delete any resource", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(baseResource);
      prismaMock.resource.delete.mockResolvedValue(baseResource);

      await deleteResource("resource-1", "admin-user", "ADMIN");

      expect(prismaMock.resource.delete).toHaveBeenCalledWith({
        where: { id: "resource-1" },
      });
    });

    it("rejects deletion by another user / different CR", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(baseResource);

      await expect(deleteResource("resource-1", "another-cr", "CR")).rejects.toMatchObject({
        statusCode: 403,
        code: "FORBIDDEN",
      });
    });

    it("throws 404 when resource does not exist", async () => {
      prismaMock.resource.findUnique.mockResolvedValue(null);

      await expect(deleteResource("non-existent", "admin-user", "ADMIN")).rejects.toMatchObject({
        statusCode: 404,
        code: "RESOURCE_NOT_FOUND",
      });
    });
  });

  describe("getHierarchy", () => {
    it("returns formatted hierarchy tree grouped by year and semester", async () => {
      prismaMock.resource.findMany.mockResolvedValue([
        {
          year: 2026,
          semesterLabel: "4th Year 2nd Semester",
          courseName: "Software Engineering",
          type: ResourceType.SLIDES,
        },
        {
          year: 2026,
          semesterLabel: "4th Year 2nd Semester",
          courseName: "Software Engineering",
          type: ResourceType.NOTES,
        },
        {
          year: 2025,
          semesterLabel: "3rd Year 1st Semester",
          courseName: "Database Systems",
          type: ResourceType.PAST_PAPER,
        },
      ]);

      const hierarchy = await getHierarchy();
      expect(hierarchy).toHaveLength(2); // 2026, 2025
      const year2026 = hierarchy.find((h) => h.year === 2026);
      expect(year2026).toBeDefined();
      expect(year2026?.semesters[0].semesterLabel).toBe("4th Year 2nd Semester");
      expect(year2026?.semesters[0].courses[0].courseName).toBe("Software Engineering");
      expect(year2026?.semesters[0].courses[0].types).toContain(ResourceType.SLIDES);
      expect(year2026?.semesters[0].courses[0].types).toContain(ResourceType.NOTES);
      expect(year2026?.semesters[0].courses[0].count).toBe(2);
    });
  });
});
