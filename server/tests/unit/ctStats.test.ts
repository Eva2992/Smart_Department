import { describe, it, expect, vi, beforeEach } from "vitest";
import { listStudentCTMarks } from "../../src/services/ct.service.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    scheduleEntry: { findMany: vi.fn() },
  },
}));

describe("CT Marks Aggregation & Class Statistics (FR-27, ADR-0005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates class average, min, max, and Best 3 of 4 aggregation", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "student-1",
      name: "John Doe",
      universityId: "20201001",
      batchId: "batch-1",
      batch: {
        id: "batch-1",
        name: "51st Batch",
        currentSemester: {
          id: "sem-1",
          name: "Semester 7",
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-06-30"),
        },
      },
    } as any);

    // 4 CTs with marks: [15, 18, 12, 20] -> Best 3: [20, 18, 15] = 53
    vi.mocked(prisma.scheduleEntry.findMany).mockResolvedValue([
      {
        id: "ct-1",
        courseId: "course-1",
        course: { id: "course-1", code: "CSE 401", name: "SWE" },
        teacher: { name: "Teacher A" },
        room: { roomNumber: "R-101" },
        date: new Date("2026-02-01"),
        startTime: new Date("2026-02-01T10:00:00Z"),
        endTime: new Date("2026-02-01T11:00:00Z"),
        topic: "CT 1",
        ctMarks: [
          { studentId: "student-1", marksObtained: 15, maxMarks: 20 },
          { studentId: "student-2", marksObtained: 19, maxMarks: 20 },
        ],
      },
      {
        id: "ct-2",
        courseId: "course-1",
        course: { id: "course-1", code: "CSE 401", name: "SWE" },
        teacher: { name: "Teacher A" },
        room: { roomNumber: "R-101" },
        date: new Date("2026-03-01"),
        startTime: new Date("2026-03-01T10:00:00Z"),
        endTime: new Date("2026-03-01T11:00:00Z"),
        topic: "CT 2",
        ctMarks: [
          { studentId: "student-1", marksObtained: 18, maxMarks: 20 },
          { studentId: "student-2", marksObtained: 16, maxMarks: 20 },
        ],
      },
      {
        id: "ct-3",
        courseId: "course-1",
        course: { id: "course-1", code: "CSE 401", name: "SWE" },
        teacher: { name: "Teacher A" },
        room: { roomNumber: "R-101" },
        date: new Date("2026-04-01"),
        startTime: new Date("2026-04-01T10:00:00Z"),
        endTime: new Date("2026-04-01T11:00:00Z"),
        topic: "CT 3",
        ctMarks: [
          { studentId: "student-1", marksObtained: 12, maxMarks: 20 },
          { studentId: "student-2", marksObtained: 14, maxMarks: 20 },
        ],
      },
      {
        id: "ct-4",
        courseId: "course-1",
        course: { id: "course-1", code: "CSE 401", name: "SWE" },
        teacher: { name: "Teacher A" },
        room: { roomNumber: "R-101" },
        date: new Date("2026-05-01"),
        startTime: new Date("2026-05-01T10:00:00Z"),
        endTime: new Date("2026-05-01T11:00:00Z"),
        topic: "CT 4",
        ctMarks: [
          { studentId: "student-1", marksObtained: 20, maxMarks: 20 },
          { studentId: "student-2", marksObtained: 18, maxMarks: 20 },
        ],
      },
    ] as any);

    const result = await listStudentCTMarks("student-1");

    expect(result.groups).toHaveLength(1);
    const group = result.groups[0];
    expect(group.totalConducted).toBe(4);
    expect(group.totalRecorded).toBe(4);
    expect(group.bestOfThreeSum).toBe(53); // 20 + 18 + 15
    expect(group.averageScore).toBe(16.25); // (15 + 18 + 12 + 20) / 4

    // First CT class stats
    const ct1 = group.marks[0];
    expect(ct1.marksObtained).toBe(15);
    expect(ct1.classAverage).toBe(17); // (15 + 19) / 2
    expect(ct1.highestMark).toBe(19);
    expect(ct1.lowestMark).toBe(15);
  });
});
