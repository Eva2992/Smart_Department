import { describe, it, expect, vi } from "vitest";
import {
  conflictService,
  evaluateInMemConflicts,
  ExistingScheduleEntryItem,
} from "../../src/services/conflictService.js";
import { ScheduleEntryStatus } from "@prisma/client";

describe("conflictService", () => {
  const sampleEntries: ExistingScheduleEntryItem[] = [
    {
      id: "entry-1",
      date: "2026-09-01",
      startTime: "09:00",
      endTime: "10:30",
      roomId: "room-101",
      teacherId: "teacher-1",
      batchId: "batch-52",
      type: "CLASS",
      status: ScheduleEntryStatus.SCHEDULED,
      course: { name: "Software Engineering", code: "CSE 404" },
      teacher: { name: "Dr. Anup Kumar" },
      room: { roomNumber: "R-101" },
      batch: { name: "52nd Batch" },
    },
    {
      id: "entry-2",
      date: "2026-09-01",
      startTime: "11:00",
      endTime: "12:30",
      roomId: "room-102",
      teacherId: "teacher-2",
      batchId: "batch-51",
      type: "CLASS",
      status: ScheduleEntryStatus.SCHEDULED,
      course: { name: "Database Systems", code: "CSE 301" },
      teacher: { name: "Dr. Farhana" },
      room: { roomNumber: "R-102" },
      batch: { name: "51st Batch" },
    },
    {
      id: "entry-cancelled",
      date: "2026-09-01",
      startTime: "14:00",
      endTime: "15:30",
      roomId: "room-101",
      teacherId: "teacher-1",
      batchId: "batch-52",
      type: "CLASS",
      status: ScheduleEntryStatus.CANCELLED,
      course: { name: "Software Engineering Lab", code: "CSE 404L" },
      teacher: { name: "Dr. Anup Kumar" },
      room: { roomNumber: "R-101" },
      batch: { name: "52nd Batch" },
    },
    {
      id: "entry-holiday",
      date: "2026-09-02",
      startTime: "09:00",
      endTime: "10:30",
      roomId: "room-101",
      teacherId: "teacher-1",
      batchId: "batch-52",
      type: "CLASS",
      status: ScheduleEntryStatus.HOLIDAY,
      course: { name: "Algorithms", code: "CSE 201" },
      room: { roomNumber: "R-101" },
      teacher: { name: "Dr. Anup Kumar" },
      batch: { name: "52nd Batch" },
    },
  ];

  describe("evaluateInMemConflicts", () => {
    it("should detect Room Conflict when different batch/teacher attempts to book same room and time", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "09:30",
        endTime: "11:00",
        roomId: "room-101",
        teacherId: "teacher-99", // Different teacher
        batchId: "batch-99", // Different batch
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe("ROOM");
      expect(result.conflicts[0].message).toContain("Room R-101 is already occupied");
      expect(result.conflicts[0].conflictingEntry.courseCode).toBe("CSE 404");
    });

    it("should detect Teacher Conflict when teacher is booked in another room", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "09:30",
        endTime: "10:00",
        roomId: "room-201", // Different room
        teacherId: "teacher-1", // Same teacher
        batchId: "batch-99", // Different batch
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe("TEACHER");
      expect(result.conflicts[0].message).toContain("Teacher Dr. Anup Kumar is already scheduled");
    });

    it("should detect Batch Conflict when batch already has a class in another room", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "09:00",
        endTime: "10:30",
        roomId: "room-202", // Different room
        teacherId: "teacher-99", // Different teacher
        batchId: "batch-52", // Same batch
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe("BATCH");
      expect(result.conflicts[0].message).toContain("Batch 52nd Batch already has");
    });

    it("should detect simultaneous 3-way conflicts when Room, Teacher, and Batch all match existing overlapping slot", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "09:00",
        endTime: "10:00",
        roomId: "room-101",
        teacherId: "teacher-1",
        batchId: "batch-52",
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts).toHaveLength(3);
      const types = result.conflicts.map((c) => c.type);
      expect(types).toContain("ROOM");
      expect(types).toContain("TEACHER");
      expect(types).toContain("BATCH");
    });

    it("should NOT conflict for abutting back-to-back classes (endA === startB)", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "10:30",
        endTime: "12:00",
        roomId: "room-101",
        teacherId: "teacher-1",
        batchId: "batch-52",
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it("should NOT conflict with CANCELLED schedule entries", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "14:00",
        endTime: "15:30",
        roomId: "room-101",
        teacherId: "teacher-1",
        batchId: "batch-52",
      });

      expect(result.hasConflict).toBe(false);
    });

    it("should NOT conflict with HOLIDAY schedule entries", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-02",
        startTime: "09:00",
        endTime: "10:30",
        roomId: "room-101",
        teacherId: "teacher-1",
        batchId: "batch-52",
      });

      expect(result.hasConflict).toBe(false);
    });

    it("should exclude entry itself when excludeScheduleEntryId is supplied (editing/rescheduling existing entry)", () => {
      const result = evaluateInMemConflicts(sampleEntries, {
        date: "2026-09-01",
        startTime: "09:00",
        endTime: "10:30",
        roomId: "room-101",
        teacherId: "teacher-1",
        batchId: "batch-52",
        excludeScheduleEntryId: "entry-1",
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe("ConflictService checkConflict with mock database client", () => {
    it("should query database and format conflict payload", async () => {
      const mockTx = {
        scheduleEntry: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "entry-db-1",
              date: new Date("2026-09-01"),
              startTime: "09:00",
              endTime: "10:30",
              roomId: "room-101",
              teacherId: "teacher-1",
              batchId: "batch-52",
              status: "SCHEDULED",
              course: { name: "Operating Systems", code: "CSE 303" },
              teacher: { name: "Prof. Tariq" },
              room: { roomNumber: "R-101" },
              batch: { name: "52nd Batch" },
            },
          ]),
        },
      };

      const result = await conflictService.checkConflict(
        {
          date: "2026-09-01",
          startTime: "09:15",
          endTime: "10:00",
          roomId: "room-101",
        },
        mockTx as any
      );

      expect(mockTx.scheduleEntry.findMany).toHaveBeenCalled();
      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].type).toBe("ROOM");
      expect(result.conflicts[0].message).toContain("CSE 303");
    });
  });
});
