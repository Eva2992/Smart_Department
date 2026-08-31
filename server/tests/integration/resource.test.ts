import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { ResourceType, Role } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    resource: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("node:fs/promises", () => ({
  default: {
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn().mockResolvedValue(undefined),
  },
  unlink: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
}));

describe("Resource Integration Routes (/api/v1/resources)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const crToken = generateAccessToken({
    userId: "cr-user-id",
    role: Role.CR,
    name: "CR Name",
    email: "cr@juniv.edu",
    batchId: "batch-52",
  });

  const studentToken = generateAccessToken({
    userId: "student-user-id",
    role: Role.STUDENT,
    name: "Student Name",
    email: "student@juniv.edu",
    batchId: "batch-52",
  });

  const adminToken = generateAccessToken({
    userId: "admin-user-id",
    role: Role.ADMIN,
    name: "Admin User",
    email: "admin@juniv.edu",
  });

  const sampleResource = {
    id: "res-123",
    title: "Midterm Notes",
    courseName: "Algorithms",
    semesterLabel: "2nd Year 1st Semester",
    year: 2026,
    type: ResourceType.NOTES,
    fileUrl: "/uploads/resources/notes.pdf",
    fileSizeBytes: 1024 * 50,
    uploaderId: "cr-user-id",
    downloadCount: 5,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    uploader: {
      id: "cr-user-id",
      name: "CR Name",
      role: "CR",
    },
  };

  describe("GET /api/v1/resources", () => {
    it("returns public list of resources without requiring authentication", async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue([sampleResource]);
      vi.mocked(prisma.resource.count).mockResolvedValue(1);

      const res = await request(app).get("/api/v1/resources?year=2026&type=NOTES").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.resources).toHaveLength(1);
      expect(res.body.data.resources[0].title).toBe("Midterm Notes");
      expect(res.body.data.pagination.total).toBe(1);
    });
  });

  describe("GET /api/v1/resources/hierarchy", () => {
    it("returns category hierarchy tree", async () => {
      vi.mocked(prisma.resource.findMany).mockResolvedValue([
        {
          year: 2026,
          semesterLabel: "2nd Year 1st Semester",
          courseName: "Algorithms",
          type: ResourceType.NOTES,
        } as any,
      ]);

      const res = await request(app).get("/api/v1/resources/hierarchy").expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].year).toBe(2026);
    });
  });

  describe("GET /api/v1/resources/:id", () => {
    it("returns single resource details", async () => {
      vi.mocked(prisma.resource.findUnique).mockResolvedValue(sampleResource);

      const res = await request(app).get("/api/v1/resources/res-123").expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("res-123");
    });

    it("returns 404 when resource not found", async () => {
      vi.mocked(prisma.resource.findUnique).mockResolvedValue(null);

      const res = await request(app).get("/api/v1/resources/missing-id").expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
    });
  });

  describe("GET /api/v1/resources/:id/download", () => {
    it("increments download count and returns resource info with json query", async () => {
      vi.mocked(prisma.resource.findUnique).mockResolvedValue(sampleResource);
      vi.mocked(prisma.resource.update).mockResolvedValue({
        ...sampleResource,
        downloadCount: 6,
      });

      const res = await request(app)
        .get("/api/v1/resources/res-123/download?json=true")
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.downloadCount).toBe(6);
    });
  });

  describe("POST /api/v1/resources", () => {
    it("rejects unauthorized requests with 401", async () => {
      await request(app).post("/api/v1/resources").field("title", "Lecture Slides").expect(401);
    });

    it("rejects regular student role with 403", async () => {
      await request(app)
        .post("/api/v1/resources")
        .set("Authorization", `Bearer ${studentToken}`)
        .field("title", "Lecture Slides")
        .expect(403);
    });

    it("allows CR to upload study resource", async () => {
      vi.mocked(prisma.resource.create).mockResolvedValue(sampleResource);

      const res = await request(app)
        .post("/api/v1/resources")
        .set("Authorization", `Bearer ${crToken}`)
        .field("title", "Midterm Notes")
        .field("courseName", "Algorithms")
        .field("semesterLabel", "2nd Year 1st Semester")
        .field("year", "2026")
        .field("type", "NOTES")
        .attach("file", Buffer.from("sample pdf content"), "notes.pdf")
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Midterm Notes");
    });
  });

  describe("DELETE /api/v1/resources/:id", () => {
    it("allows CR owner to delete resource", async () => {
      vi.mocked(prisma.resource.findUnique).mockResolvedValue(sampleResource);
      vi.mocked(prisma.resource.delete).mockResolvedValue(sampleResource);

      const res = await request(app)
        .delete("/api/v1/resources/res-123")
        .set("Authorization", `Bearer ${crToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("allows Admin to delete any resource", async () => {
      vi.mocked(prisma.resource.findUnique).mockResolvedValue(sampleResource);
      vi.mocked(prisma.resource.delete).mockResolvedValue(sampleResource);

      const res = await request(app)
        .delete("/api/v1/resources/res-123")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it("rejects deletion by non-owner CR with 403", async () => {
      const otherCrToken = generateAccessToken({
        userId: "other-cr-id",
        role: Role.CR,
        name: "Other CR",
        email: "other@juniv.edu",
      });

      vi.mocked(prisma.resource.findUnique).mockResolvedValue(sampleResource);

      const res = await request(app)
        .delete("/api/v1/resources/res-123")
        .set("Authorization", `Bearer ${otherCrToken}`)
        .expect(403);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });
});
