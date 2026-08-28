import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/middleware/errorHandler.js";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    scheduleEntry: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: prismaMock,
}));

import { cancelCT, listStudentCTMarks, scheduleCT, updateCT } from "../../src/services/ct.service.js";

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

  it("updates an owned CT date, time, room, and topic", async () => {
    const ctSlot = {
      id: "ct-1",
      type: "CT",
      status: "SCHEDULED",
      teacherId: "teacher-1",
      batchId: "batch-1",
      roomId: "room-1",
      courseId: "course-1",
      date: new Date("2099-08-27T00:00:00.000Z"),
      startTime: new Date("2099-08-27T09:00:00.000Z"),
      endTime: new Date("2099-08-27T10:00:00.000Z"),
      topic: "Old topic",
      course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
      batch: { id: "batch-1", name: "52nd" },
      teacher: { id: "teacher-1", name: "Dr. Karim" },
      room: { id: "room-1", roomNumber: "R-101" },
    };
    const newDate = new Date("2099-09-01T00:00:00.000Z");
    const newStartTime = new Date("2099-09-01T11:00:00.000Z");
    const newEndTime = new Date("2099-09-01T12:00:00.000Z");

    prismaMock.scheduleEntry.findUnique.mockResolvedValue(ctSlot);
    prismaMock.room.findUnique.mockResolvedValue({ id: "room-2", roomNumber: "R-102" });
    prismaMock.scheduleEntry.findMany.mockResolvedValue([]);
    prismaMock.scheduleEntry.update.mockResolvedValue({
      ...ctSlot,
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      roomId: "room-2",
      room: { id: "room-2", roomNumber: "R-102" },
      topic: "Updated topic",
    });

    const result = await updateCT({
      ctId: "ct-1",
      teacherId: "teacher-1",
      topic: "Updated topic",
      date: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      roomNumber: "R-102",
    });

    expect(prismaMock.scheduleEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ct-1" },
        data: expect.objectContaining({
          date: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          roomId: "room-2",
          topic: "Updated topic",
        }),
      })
    );
    expect(result.ctEntry.room.roomNumber).toBe("R-102");
    expect(result.ctEntry.topic).toBe("Updated topic");
  });

  it("cancels an owned CT by restoring it back to a scheduled class", async () => {
    const ctSlot = {
      id: "ct-2",
      type: "CT",
      status: "SCHEDULED",
      teacherId: "teacher-1",
      batchId: "batch-1",
      roomId: "room-1",
      courseId: "course-1",
      date: new Date("2099-08-27T00:00:00.000Z"),
      startTime: new Date("2099-08-27T09:00:00.000Z"),
      endTime: new Date("2099-08-27T10:00:00.000Z"),
      topic: "CT topic",
      course: { id: "course-1", code: "CSE 404", name: "Software Engineering" },
      batch: { id: "batch-1", name: "52nd" },
      teacher: { id: "teacher-1", name: "Dr. Karim" },
      room: { id: "room-1", roomNumber: "R-101" },
    };

    prismaMock.scheduleEntry.findUnique.mockResolvedValue(ctSlot);
    prismaMock.scheduleEntry.update.mockResolvedValue({
      ...ctSlot,
      type: "CLASS",
      status: "SCHEDULED",
      topic: null,
    });

    const result = await cancelCT({
      ctId: "ct-2",
      teacherId: "teacher-1",
    });

    expect(prismaMock.scheduleEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ct-2" },
        data: {
          type: "CLASS",
          status: "SCHEDULED",
          topic: null,
        },
      })
    );
    expect(result.ctEntry.type).toBe("CLASS");
    expect(result.ctEntry.topic).toBeNull();
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
