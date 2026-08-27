import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/middleware/errorHandler.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    scheduleEntry: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import { listStudentCTMarks, scheduleCT } from "../../src/services/ct.service.js";

describe("CT service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts an owned class slot into a CT session", async () => {
    const classSlot = {
      id: "slot-1",
      type: "CLASS",
      status: "SCHEDULED",
      teacherId: "teacher-1",
      batchId: "batch-1",
      roomId: "room-1",
      courseId: "course-1",
      date: new Date("2026-08-27T00:00:00.000Z"),
      startTime: new Date("2026-08-27T09:00:00.000Z"),
      endTime: new Date("2026-08-27T10:00:00.000Z"),
      topic: null,
      course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
      batch: { id: "batch-1", name: "52nd" },
      teacher: { id: "teacher-1", name: "Dr. Karim" },
      room: { id: "room-1", roomNumber: "R-101" },
    };

    prismaMock.scheduleEntry.findUnique.mockResolvedValue(classSlot);
    prismaMock.scheduleEntry.findMany.mockResolvedValue([]);
    prismaMock.scheduleEntry.update.mockResolvedValue({
      ...classSlot,
      type: "CT",
      topic: "Midterm coverage",
    });

    const result = await scheduleCT({
      scheduleEntryId: "slot-1",
      teacherId: "teacher-1",
      topic: "Midterm coverage",
    });

    expect(result.ctEntry.type).toBe("CT");
    expect(result.ctEntry.topic).toBe("Midterm coverage");
    expect(result.warnings).toEqual([]);
  });

  it("requires confirmation when another CT already exists on the same date for the batch", async () => {
    prismaMock.scheduleEntry.findUnique.mockResolvedValue({
      id: "slot-2",
      type: "CLASS",
      status: "SCHEDULED",
      teacherId: "teacher-1",
      batchId: "batch-1",
      roomId: "room-1",
      courseId: "course-1",
      date: new Date("2026-08-27T00:00:00.000Z"),
      startTime: new Date("2026-08-27T11:00:00.000Z"),
      endTime: new Date("2026-08-27T12:00:00.000Z"),
      course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
      batch: { id: "batch-1", name: "52nd" },
      teacher: { id: "teacher-1", name: "Dr. Karim" },
      room: { id: "room-1", roomNumber: "R-101" },
    });
    prismaMock.scheduleEntry.findMany.mockImplementation(async (args) => {
      if (args?.where?.type === "CT") {
        return [
          {
            id: "ct-previous",
            course: { code: "CSE 401", name: "Algorithms" },
            room: { roomNumber: "R-102" },
            date: new Date("2026-08-27T00:00:00.000Z"),
            startTime: new Date("2026-08-27T09:00:00.000Z"),
            endTime: new Date("2026-08-27T10:00:00.000Z"),
          },
        ];
      }

      return [];
    });
    prismaMock.scheduleEntry.update.mockResolvedValue({
      id: "slot-2",
      type: "CT",
      topic: "Quiz",
    });

    await expect(
      scheduleCT({
        scheduleEntryId: "slot-2",
        teacherId: "teacher-1",
        topic: "Quiz",
      })
    ).rejects.toMatchObject({ code: "CT_SAME_DAY_WARNING" });

    const confirmed = await scheduleCT({
      scheduleEntryId: "slot-2",
      teacherId: "teacher-1",
      topic: "Quiz",
      confirmSameDayConflict: true,
    });

    expect(confirmed.warnings).toHaveLength(1);
  });

  it("returns grouped CT marks for a student", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "student-1",
      name: "A Student",
      universityId: "2021-1-60-001",
      batchId: "batch-1",
      batch: {
        id: "batch-1",
        name: "52nd",
        currentSemester: {
          id: "semester-1",
          name: "Semester 1",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-12-31T00:00:00.000Z"),
        },
      },
    });

    prismaMock.scheduleEntry.findMany.mockResolvedValue([
      {
        id: "ct-1",
        courseId: "course-1",
        topic: "Chapter 1",
        date: new Date("2026-08-27T00:00:00.000Z"),
        startTime: new Date("2026-08-27T09:00:00.000Z"),
        endTime: new Date("2026-08-27T10:00:00.000Z"),
        course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
        teacher: { name: "Dr. Karim" },
        room: { roomNumber: "R-101" },
        ctMarks: [{ marksObtained: 18, maxMarks: 20 }],
      },
    ]);

    const result = await listStudentCTMarks("student-1");

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].marks[0].status).toBe("RECORDED");
  });

  it("throws a typed error when the student does not exist", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(listStudentCTMarks("missing")).rejects.toBeInstanceOf(AppError);
  });
});
