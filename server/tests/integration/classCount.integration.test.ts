import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { Role } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    scheduleEntry: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Class Count Integration Tests (GET /api/v1/schedules/class-count)", () => {
  const studentToken = generateAccessToken({
    userId: "student-1",
    email: "student@juniv.edu",
    role: "STUDENT",
    name: "Student One",
  });

  const teacherToken = generateAccessToken({
    userId: "teacher-1",
    email: "teacher@juniv.edu",
    role: "TEACHER",
    name: "Teacher One",
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 if unauthenticated", async () => {
    const res = await request(app).get("/api/v1/schedules/class-count");
    expect(res.status).toBe(401);
  });

  it("returns student course class counts", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      batchId: "batch-1",
      batch: { id: "batch-1", name: "51st Batch" },
    } as any);

    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([
      {
        id: "e-1",
        courseId: "c-1",
        teacherId: "t-1",
        course: { id: "c-1", code: "CSE 401", name: "Software Eng" },
        teacher: { id: "t-1", name: "Dr. Karim" },
        batch: { id: "batch-1", name: "51st Batch" },
      } as any,
    ]);

    const res = await request(app)
      .get("/api/v1/schedules/class-count")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(Role.STUDENT);
    expect(res.body.data.courses).toHaveLength(1);
  });

  it("returns teacher batch class counts", async () => {
    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([
      {
        id: "e-2",
        batchId: "batch-51",
        courseId: "c-1",
        batch: { id: "batch-51", name: "51st Batch" },
        course: { id: "c-1", code: "CSE 401", name: "Software Eng" },
      } as any,
    ]);

    const res = await request(app)
      .get("/api/v1/schedules/class-count")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe(Role.TEACHER);
    expect(res.body.data.batches).toHaveLength(1);
  });
});
