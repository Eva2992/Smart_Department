/**
 * Unit tests for examService.ts
 * FR-22: Semester Final Exam Routine Generation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScheduleEntryType, ScheduleEntryStatus } from "@prisma/client";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    scheduleEntry: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    batch: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("../../src/services/conflictService.js", () => ({
  conflictService: {
    checkConflict: vi.fn(),
  },
}));

import { prisma } from "../../src/lib/prisma.js";
import { conflictService } from "../../src/services/conflictService.js";
import {
  createExamRoutine,
  getExamSchedule,
  getExamEntryById,
  updateExamEntry,
  cancelExamEntry,
} from "../../src/services/examService.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ADMIN_ID = "admin-uuid-001";
const BATCH_ID = "batch-uuid-001";
const ROOM_ID = "room-uuid-r202";
const TEACHER_ID = "teacher-uuid-001";

const rawExamEntry = {
  id: "exam-uuid-001",
  type: ScheduleEntryType.EXAM,
  status: ScheduleEntryStatus.SCHEDULED,
  courseId: null,
  course: null,
  batchId: BATCH_ID,
  batch: { name: "52nd" },
  teacherId: TEACHER_ID,
  teacher: { name: "Dr. Islam" },
  roomId: ROOM_ID,
  room: { roomNumber: "R-202" },
  date: new Date("2026-12-15"),
  startTime: new Date("2026-12-15T09:00:00.000Z"),
  endTime: new Date("2026-12-15T12:00:00.000Z"),
  topic: "Data Structures",
  createdAt: new Date("2026-09-01"),
  updatedAt: new Date("2026-09-01"),
};

// ── createExamRoutine ──────────────────────────────────────────────────────────

describe("createExamRoutine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates exam entries when no conflicts exist", async () => {
    vi.mocked(conflictService.checkConflict).mockResolvedValue({
      hasConflict: false,
      conflicts: [],
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      vi.mocked(prisma.scheduleEntry.create).mockResolvedValue(rawExamEntry as any);
      return fn(prisma as any);
    });

    const result = await createExamRoutine(
      {
        entries: [
          {
            batchId: BATCH_ID,
            courseName: "Data Structures",
            roomId: ROOM_ID,
            teacherId: TEACHER_ID,
            date: "2026-12-15",
            startTime: "09:00",
            endTime: "12:00",
          },
        ],
      },
      ADMIN_ID
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("EXAM");
    expect(result[0].batchId).toBe(BATCH_ID);
  });

  it("throws EXAM_CONFLICT when conflictService detects a conflict", async () => {
    vi.mocked(conflictService.checkConflict).mockResolvedValue({
      hasConflict: true,
      conflicts: [
        {
          type: "ROOM",
          message: "Room R-202 is already occupied",
          conflictingEntry: {} as any,
        },
      ],
      summaryMessage: "Room R-202 is already occupied",
    });

    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      return fn(prisma as any);
    });

    await expect(
      createExamRoutine(
        {
          entries: [
            {
              batchId: BATCH_ID,
              courseName: "Algorithms",
              roomId: ROOM_ID,
              date: "2026-12-15",
              startTime: "09:00",
              endTime: "12:00",
            },
          ],
        },
        ADMIN_ID
      )
    ).rejects.toMatchObject({ statusCode: 409, code: "EXAM_CONFLICT" });
  });

  it("throws VALIDATION_ERROR when entries array is empty", async () => {
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(prisma as any));

    await expect(
      createExamRoutine({ entries: [] }, ADMIN_ID)
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

// ── getExamSchedule ────────────────────────────────────────────────────────────

describe("getExamSchedule", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns paginated exam entries", async () => {
    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([rawExamEntry as any]);
    vi.mocked(prisma.scheduleEntry.count).mockResolvedValue(1);

    const result = await getExamSchedule({ batchId: BATCH_ID });

    expect(result.exams).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
    expect(result.exams[0].roomNumber).toBe("R-202");
  });

  it("returns empty list when no exams exist", async () => {
    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([]);
    vi.mocked(prisma.scheduleEntry.count).mockResolvedValue(0);

    const result = await getExamSchedule({});

    expect(result.exams).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });
});

// ── getExamEntryById ───────────────────────────────────────────────────────────

describe("getExamEntryById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a single exam entry", async () => {
    vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);

    const result = await getExamEntryById("exam-uuid-001");

    expect(result.id).toBe("exam-uuid-001");
    expect(result.type).toBe("EXAM");
  });

  it("throws EXAM_NOT_FOUND when entry missing", async () => {
    vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(null);

    await expect(getExamEntryById("bad-id")).rejects.toMatchObject({
      statusCode: 404,
      code: "EXAM_NOT_FOUND",
    });
  });
});

// ── updateExamEntry ────────────────────────────────────────────────────────────

describe("updateExamEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates exam entry when no conflict detected", async () => {
    vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);
    vi.mocked(conflictService.checkConflict).mockResolvedValue({
      hasConflict: false,
      conflicts: [],
    });
    vi.mocked(prisma.scheduleEntry.update).mockResolvedValue({
      ...rawExamEntry,
      topic: "Operating Systems",
    } as any);

    const result = await updateExamEntry("exam-uuid-001", {
      courseName: "Operating Systems",
    });

    expect(result.topic).toBe("Operating Systems");
  });

  it("throws EXAM_CONFLICT when conflict detected on update", async () => {
    vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);
    vi.mocked(conflictService.checkConflict).mockResolvedValue({
      hasConflict: true,
      conflicts: [
        {
          type: "BATCH",
          message: "Batch 52nd already has an exam at this time",
          conflictingEntry: {} as any,
        },
      ],
      summaryMessage: "Batch 52nd already has an exam at this time",
    });

    await expect(
      updateExamEntry("exam-uuid-001", { roomId: "another-room" })
    ).rejects.toMatchObject({ statusCode: 409, code: "EXAM_CONFLICT" });
  });
});

// ── cancelExamEntry ────────────────────────────────────────────────────────────

describe("cancelExamEntry", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets status to CANCELLED", async () => {
    vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(rawExamEntry as any);
    vi.mocked(prisma.scheduleEntry.update).mockResolvedValue({
      ...rawExamEntry,
      status: ScheduleEntryStatus.CANCELLED,
    } as any);

    const result = await cancelExamEntry("exam-uuid-001");

    expect(result.status).toBe("CANCELLED");
    expect(prisma.scheduleEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: ScheduleEntryStatus.CANCELLED },
      })
    );
  });

  it("throws EXAM_NOT_FOUND when entry missing", async () => {
    vi.mocked(prisma.scheduleEntry.findUnique).mockResolvedValue(null);

    await expect(cancelExamEntry("bad-id")).rejects.toMatchObject({
      code: "EXAM_NOT_FOUND",
    });
  });
});
