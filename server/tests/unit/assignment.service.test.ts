import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/middleware/errorHandler.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    course: {
      findUnique: vi.fn(),
    },
    assignment: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import { createAssignment, listAssignments } from "../../src/services/assignment.service.js";

describe("Assignment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an assignment for the teacher's own course", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      teacherId: "teacher-1",
      semester: {
        batchId: "batch-1",
        batch: { id: "batch-1", name: "52nd" },
      },
    });

    prismaMock.assignment.create.mockResolvedValue({
      id: "assignment-1",
      teacherId: "teacher-1",
      courseId: "course-1",
      batchId: "batch-1",
      title: "Assignment 1",
      description: "Submit report",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
      createdAt: new Date("2026-08-27T00:00:00.000Z"),
      course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
      teacher: { id: "teacher-1", name: "Dr. Karim" },
      batch: { id: "batch-1", name: "52nd" },
    });

    const result = await createAssignment({
      teacherId: "teacher-1",
      courseId: "course-1",
      batchId: "batch-1",
      title: "Assignment 1",
      description: "Submit report",
      dueDate: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(result.status).toBe("UPCOMING");
    expect(result.title).toBe("Assignment 1");
  });

  it("rejects assignment creation when the course belongs to another teacher", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      teacherId: "teacher-2",
      semester: {
        batchId: "batch-1",
        batch: { id: "batch-1", name: "52nd" },
      },
    });

    await expect(
      createAssignment({
        teacherId: "teacher-1",
        courseId: "course-1",
        batchId: "batch-1",
        title: "Assignment 1",
        description: "Submit report",
        dueDate: new Date("2026-09-01T00:00:00.000Z"),
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it("lists assignments with computed due-date status", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      {
        id: "assignment-1",
        courseId: "course-1",
        batchId: "batch-1",
        teacherId: "teacher-1",
        title: "Assignment 1",
        description: "Submit report",
        dueDate: new Date("2030-09-01T00:00:00.000Z"),
        createdAt: new Date("2026-08-27T00:00:00.000Z"),
        course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
        teacher: { id: "teacher-1", name: "Dr. Karim" },
        batch: { id: "batch-1", name: "52nd" },
      },
    ]);

    const result = await listAssignments("batch-1");

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("UPCOMING");
  });
});
