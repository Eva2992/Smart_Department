import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleService } from "../../src/services/scheduleService.js";
import { conflictService } from "../../src/services/conflictService.js";
import { holidayService } from "../../src/services/holidayService.js";
import { prisma } from "../../src/lib/prisma.js";
import { Role, ScheduleEntryStatus } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    scheduleEntry: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    room: {
      findMany: vi.fn(),
    },
  },
}));

describe("scheduleService - getSuggestedSlots (FR-19)", () => {
  const sampleEntry = {
    id: "entry-1",
    date: new Date("2026-09-01"),
    startTime: new Date("2026-09-01T09:00:00Z"),
    endTime: new Date("2026-09-01T10:30:00Z"),
    roomId: "r-101",
    teacherId: "teacher-1",
    batchId: "batch-52",
    status: ScheduleEntryStatus.SCHEDULED,
    course: { id: "c-1", name: "Data Structures", code: "CSE 201" },
  };

  const sampleRooms = [
    { id: "r-101", roomNumber: "R-101", type: "CLASSROOM", description: "Ground floor" },
    { id: "r-102", roomNumber: "R-102", type: "CLASSROOM", description: "Ground floor" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty slots when target date is a declared holiday", async () => {
    (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
    vi.spyOn(holidayService, "isHolidayDate").mockResolvedValueOnce(true);

    const result = await scheduleService.getSuggestedSlots("entry-1", "2026-09-15");

    expect(result.isHoliday).toBe(true);
    expect(result.slots).toHaveLength(0);
    expect(result.holidayReason).toContain("holiday");
  });

  it("should mark slot unavailable if teacher has a conflicting class", async () => {
    (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
    vi.spyOn(holidayService, "isHolidayDate").mockResolvedValueOnce(false);
    (prisma.room.findMany as any).mockResolvedValue(sampleRooms);

    // Existing entry on target date where teacher-1 is teaching in 08:30 - 10:00
    (prisma.scheduleEntry.findMany as any).mockResolvedValue([
      {
        id: "entry-other-1",
        teacherId: "teacher-1",
        batchId: "batch-50",
        roomId: "r-101",
        startTime: "08:30",
        endTime: "10:00",
      },
    ]);

    const result = await scheduleService.getSuggestedSlots("entry-1", "2026-09-15");

    expect(result.isHoliday).toBe(false);
    expect(result.slots.length).toBeGreaterThan(0);

    const firstSlot = result.slots.find((s) => s.startTime === "08:30");
    expect(firstSlot?.isAvailable).toBe(false);
    expect(firstSlot?.reason).toContain("Teacher is already scheduled");

    const secondSlot = result.slots.find((s) => s.startTime === "10:00");
    expect(secondSlot?.isAvailable).toBe(true);
    expect(secondSlot?.availableRooms).toHaveLength(2);
  });

  it("should mark slot unavailable if batch has a conflicting class", async () => {
    (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
    vi.spyOn(holidayService, "isHolidayDate").mockResolvedValueOnce(false);
    (prisma.room.findMany as any).mockResolvedValue(sampleRooms);

    // Existing entry on target date where batch-52 has a class with teacher-2
    (prisma.scheduleEntry.findMany as any).mockResolvedValue([
      {
        id: "entry-other-2",
        teacherId: "teacher-2",
        batchId: "batch-52",
        roomId: "r-102",
        startTime: "10:00",
        endTime: "11:30",
      },
    ]);

    const result = await scheduleService.getSuggestedSlots("entry-1", "2026-09-15");

    const secondSlot = result.slots.find((s) => s.startTime === "10:00");
    expect(secondSlot?.isAvailable).toBe(false);
    expect(secondSlot?.reason).toContain("Batch already has another class");
  });

  it("should filter out occupied rooms and mark slot unavailable if all rooms are occupied", async () => {
    (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
    vi.spyOn(holidayService, "isHolidayDate").mockResolvedValueOnce(false);
    (prisma.room.findMany as any).mockResolvedValue(sampleRooms);

    // Both r-101 and r-102 occupied by other teachers & batches at 11:30 - 13:00
    (prisma.scheduleEntry.findMany as any).mockResolvedValue([
      {
        id: "entry-other-3",
        teacherId: "teacher-3",
        batchId: "batch-50",
        roomId: "r-101",
        startTime: "11:30",
        endTime: "13:00",
      },
      {
        id: "entry-other-4",
        teacherId: "teacher-4",
        batchId: "batch-51",
        roomId: "r-102",
        startTime: "11:30",
        endTime: "13:00",
      },
    ]);

    const result = await scheduleService.getSuggestedSlots("entry-1", "2026-09-15");

    const slot = result.slots.find((s) => s.startTime === "11:30");
    expect(slot?.isAvailable).toBe(false);
    expect(slot?.reason).toContain("No departmental rooms");
  });

  it("should return available slot with free rooms when partially occupied", async () => {
    (prisma.scheduleEntry.findUnique as any).mockResolvedValue(sampleEntry);
    vi.spyOn(holidayService, "isHolidayDate").mockResolvedValueOnce(false);
    (prisma.room.findMany as any).mockResolvedValue(sampleRooms);

    // Only r-101 occupied at 13:30 - 15:00
    (prisma.scheduleEntry.findMany as any).mockResolvedValue([
      {
        id: "entry-other-5",
        teacherId: "teacher-3",
        batchId: "batch-50",
        roomId: "r-101",
        startTime: "13:30",
        endTime: "15:00",
      },
    ]);

    const result = await scheduleService.getSuggestedSlots("entry-1", "2026-09-15");

    const slot = result.slots.find((s) => s.startTime === "13:30");
    expect(slot?.isAvailable).toBe(true);
    expect(slot?.availableRooms).toHaveLength(1);
    expect(slot?.availableRooms[0].id).toBe("r-102");
  });
});
