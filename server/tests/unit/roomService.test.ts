import { describe, it, expect, vi, beforeEach } from "vitest";
import { scheduleService } from "../../src/services/scheduleService.js";
import { prisma } from "../../src/lib/prisma.js";
import { ScheduleEntryStatus } from "@prisma/client";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    room: {
      findMany: vi.fn(),
    },
    scheduleEntry: {
      findMany: vi.fn(),
    },
  },
}));

describe("scheduleService - Room Availability & Grid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllRoomsSchedule", () => {
    it("should throw validation error if startDate is after endDate", async () => {
      await expect(
        scheduleService.getAllRoomsSchedule("2026-09-10", "2026-09-01")
      ).rejects.toThrow("startDate cannot be after endDate");
    });

    it("should throw validation error if date range exceeds 7 days", async () => {
      await expect(
        scheduleService.getAllRoomsSchedule("2026-09-01", "2026-09-15")
      ).rejects.toThrow("Date range cannot exceed 7 days");
    });

    it("should return formatted room schedule grid across date range", async () => {
      (prisma.room.findMany as any).mockResolvedValue([
        { id: "room-101", roomNumber: "R-101", type: "CLASSROOM", description: "Classroom 80 cap" },
        { id: "room-201", roomNumber: "R-201", type: "COMPUTER_LAB", description: "Lab 1" },
      ]);

      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        {
          id: "entry-1",
          roomId: "room-101",
          date: new Date("2026-09-01"),
          startTime: new Date("2026-09-01T08:30:00Z"),
          endTime: new Date("2026-09-01T10:00:00Z"),
          type: "CLASS",
          status: ScheduleEntryStatus.SCHEDULED,
          course: { name: "Software Engineering", code: "CSE 404" },
          teacher: { name: "Dr. Anup" },
          batch: { name: "52nd Batch" },
        },
      ]);

      const result = await scheduleService.getAllRoomsSchedule("2026-09-01", "2026-09-03");

      expect(result.rooms).toHaveLength(2);
      expect(result.dates).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
      expect(result.grid["room-101"]).toBeDefined();
      expect(result.grid["room-101"]["2026-09-01"]).toBeDefined();
      expect(result.grid["room-101"]["2026-09-01"][0].isAvailable).toBe(false);
      expect(result.grid["room-101"]["2026-09-01"][0].booking?.courseCode).toBe("CSE 404");
      expect(result.grid["room-101"]["2026-09-01"][1].isAvailable).toBe(true);

      // On 2026-09-02, all slots for room-101 should be available
      expect(result.grid["room-101"]["2026-09-02"].every((s) => s.isAvailable)).toBe(true);
    });
  });
});
