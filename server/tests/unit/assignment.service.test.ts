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
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import {
  createAssignment,
  listAssignments,
  updateAssignment,
  deleteAssignment,
} from "../../src/services/assignment.service.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseAssignment = {
  id: "assignment-1",
  teacherId: "teacher-1",
  courseId: "course-1",
  batchId: "batch-1",
  title: "Assignment 1",
  description: "Submit report",
  dueDate: new Date("2030-09-01T00:00:00.000Z"),
  createdAt: new Date("2026-08-27T00:00:00.000Z"),
  course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
  teacher: { id: "teacher-1", name: "Dr. Karim" },
  batch: { id: "batch-1", name: "52nd" },
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Assignment service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── createAssignment ──────────────────────────────────────────────────────

  it("creates an assignment for the teacher's own course", async () => {
    prismaMock.course.findUnique.mockResolvedValue({
      id: "course-1",
      teacherId: "teacher-1",
      semester: {
        batchId: "batch-1",
        batch: { id: "batch-1", name: "52nd" },
      },
    });

    prismaMock.assignment.create.mockResolvedValue(baseAssignment);

    const result = await createAssignment({
      teacherId: "teacher-1",
      courseId: "course-1",
      batchId: "batch-1",
      title: "Assignment 1",
      description: "Submit report",
      dueDate: new Date("2030-09-01T00:00:00.000Z"),
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
        dueDate: new Date("2030-09-01T00:00:00.000Z"),
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  // ── listAssignments ───────────────────────────────────────────────────────

  it("lists assignments with computed due-date status", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([baseAssignment]);

    const result = await listAssignments("batch-1");

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("UPCOMING");
  });

  it("marks past-due assignments correctly", async () => {
    prismaMock.assignment.findMany.mockResolvedValue([
      { ...baseAssignment, dueDate: new Date("2020-01-01T00:00:00.000Z") },
    ]);

    const result = await listAssignments("batch-1");
    expect(result[0].status).toBe("PAST_DUE");
  });

  // ── updateAssignment ──────────────────────────────────────────────────────

  it("updates title, description and dueDate for the owner", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(baseAssignment);

    const updatedAssignment = {
      ...baseAssignment,
      title: "Revised Title",
      description: "Updated description",
      dueDate: new Date("2031-01-01T00:00:00.000Z"),
    };
    prismaMock.assignment.update.mockResolvedValue(updatedAssignment);

    const result = await updateAssignment({
      assignmentId: "assignment-1",
      teacherId: "teacher-1",
      title: "Revised Title",
      description: "Updated description",
      dueDate: new Date("2031-01-01T00:00:00.000Z"),
    });

    expect(prismaMock.assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "assignment-1" },
        data: expect.objectContaining({
          title: "Revised Title",
          description: "Updated description",
        }),
      })
    );
    expect(result.title).toBe("Revised Title");
    expect(result.status).toBe("UPCOMING");
  });

  it("rejects updateAssignment when a different teacher tries to edit", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({
      ...baseAssignment,
      teacherId: "teacher-2",
    });

    await expect(
      updateAssignment({
        assignmentId: "assignment-1",
        teacherId: "teacher-1",
        title: "Attempted edit",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects updateAssignment when the new dueDate is in the past", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(baseAssignment);

    await expect(
      updateAssignment({
        assignmentId: "assignment-1",
        teacherId: "teacher-1",
        dueDate: new Date("2020-01-01T00:00:00.000Z"),
      })
    ).rejects.toMatchObject({ code: "INVALID_DUE_DATE" });
  });

  // ── deleteAssignment ──────────────────────────────────────────────────────

  it("deletes an assignment owned by the requesting teacher", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(baseAssignment);
    prismaMock.assignment.delete.mockResolvedValue(baseAssignment);

    await deleteAssignment("assignment-1", "teacher-1");

    expect(prismaMock.assignment.delete).toHaveBeenCalledWith({
      where: { id: "assignment-1" },
    });
  });

  it("rejects deleteAssignment when a different teacher tries to delete", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue({
      ...baseAssignment,
      teacherId: "teacher-2",
    });

    await expect(deleteAssignment("assignment-1", "teacher-1")).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("throws when the assignment to delete does not exist", async () => {
    prismaMock.assignment.findUnique.mockResolvedValue(null);

    await expect(deleteAssignment("missing-id", "teacher-1")).rejects.toBeInstanceOf(AppError);
  });
});
