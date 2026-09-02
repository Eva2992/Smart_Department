import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import { generateAccessToken } from "../../src/utils/token.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    assignment: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    assignmentSubmission: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("Assignment Submission Integration Tests", () => {
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

  const mockAssignment = {
    id: "assign-123",
    batchId: "batch-51",
    dueDate: new Date(Date.now() + 86400000),
  };

  const mockStudent = {
    id: "student-1",
    batchId: "batch-51",
    role: "STUDENT",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits an assignment via URL at /api/v1/assignments/:id/submissions", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockStudent as any);
    vi.mocked(prisma.assignmentSubmission.upsert).mockResolvedValue({
      id: "sub-1",
      assignmentId: "assign-123",
      studentId: "student-1",
      submissionType: "URL",
      submissionUrl: "https://github.com/my/repo",
      submittedAt: new Date(),
    } as any);

    const res = await request(app)
      .post("/api/v1/assignments/assign-123/submissions")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        submissionUrl: "https://github.com/my/repo",
        notes: "Here is my final project link",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.submissionUrl).toBe("https://github.com/my/repo");
  });

  it("retrieves submissions list at /api/v1/assignments/:id/submissions", async () => {
    vi.mocked(prisma.assignment.findUnique).mockResolvedValue(mockAssignment as any);
    vi.mocked(prisma.assignmentSubmission.findMany).mockResolvedValue([
      {
        id: "sub-1",
        assignmentId: "assign-123",
        studentId: "student-1",
        student: { id: "student-1", name: "Student One", email: "student@juniv.edu" },
      } as any,
    ]);

    const res = await request(app)
      .get("/api/v1/assignments/assign-123/submissions")
      .set("Authorization", `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });
});
