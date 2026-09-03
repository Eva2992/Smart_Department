import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleService } from "../../src/services/scheduleService.js";
import { prisma } from "../../src/lib/prisma.js";
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

describe("Class Count Tracking Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates student view: classes conducted per course per teacher", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "student-1",
      role: Role.STUDENT,
      batchId: "batch-1",
      batch: { id: "batch-1", name: "51st Batch" },
    } as any);

    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([
      {
        id: "entry-1",
        courseId: "course-1",
        teacherId: "teacher-1",
        course: { id: "course-1", code: "CSE 401", name: "Software Eng" },
        teacher: { id: "teacher-1", name: "Dr. Karim" },
        batch: { id: "batch-1", name: "51st Batch" },
      },
      {
        id: "entry-2",
        courseId: "course-1",
        teacherId: "teacher-1",
        course: { id: "course-1", code: "CSE 401", name: "Software Eng" },
        teacher: { id: "teacher-1", name: "Dr. Karim" },
        batch: { id: "batch-1", name: "51st Batch" },
      },
      {
        id: "entry-3",
        courseId: "course-1",
        teacherId: "teacher-2",
        course: { id: "course-1", code: "CSE 401", name: "Software Eng" },
        teacher: { id: "teacher-2", name: "Prof. Rahim" },
        batch: { id: "batch-1", name: "51st Batch" },
      },
    ] as any);

    const result: any = await scheduleService.getClassCounts({
      userId: "student-1",
      role: Role.STUDENT,
      email: "student@juniv.edu",
    } as any);

    expect(result.role).toBe(Role.STUDENT);
    expect(result.totalConducted).toBe(3);
    expect(result.courses).toHaveLength(1);
    expect(result.courses[0].courseCode).toBe("CSE 401");
    expect(result.courses[0].teachers).toHaveLength(2);
    expect(result.courses[0].teachers[0].classCount).toBe(2);
    expect(result.courses[0].teachers[1].classCount).toBe(1);
  });

  it("calculates teacher view: classes taken per batch", async () => {
    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([
      {
        id: "entry-1",
        batchId: "batch-51",
        courseId: "course-1",
        batch: { id: "batch-51", name: "51st Batch" },
        course: { id: "course-1", code: "CSE 401", name: "Software Eng" },
      },
      {
        id: "entry-2",
        batchId: "batch-51",
        courseId: "course-1",
        batch: { id: "batch-51", name: "51st Batch" },
        course: { id: "course-1", code: "CSE 401", name: "Software Eng" },
      },
      {
        id: "entry-3",
        batchId: "batch-52",
        courseId: "course-2",
        batch: { id: "batch-52", name: "52nd Batch" },
        course: { id: "course-2", code: "CSE 301", name: "Operating Systems" },
      },
    ] as any);

    const result: any = await scheduleService.getClassCounts({
      userId: "teacher-1",
      role: Role.TEACHER,
      email: "teacher@juniv.edu",
    } as any);

    expect(result.role).toBe(Role.TEACHER);
    expect(result.totalClassesTaken).toBe(3);
    expect(result.batches).toHaveLength(2);
    expect(result.batches[0].batchName).toBe("51st Batch");
    expect(result.batches[0].classCount).toBe(2);
    expect(result.batches[1].batchName).toBe("52nd Batch");
    expect(result.batches[1].classCount).toBe(1);
  });
});
