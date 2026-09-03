import { describe, it, expect, vi, beforeEach } from "vitest";
import { dashboardService } from "../../src/services/dashboard.service.js";
import { prisma } from "../../src/lib/prisma.js";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    batch: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    scheduleEntry: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    assignment: {
      findMany: vi.fn(),
    },
    cTMark: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    course: {
      findMany: vi.fn(),
    },
    semester: {
      count: vi.fn(),
    },
    promotionRequest: {
      findMany: vi.fn(),
    },
    holiday: {
      findMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
    },
  },
}));

describe("DashboardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStudentDashboard", () => {
    it("should return student dashboard aggregated data", async () => {
      const mockBatch = {
        id: "batch-1",
        name: "52nd",
        program: "HONOURS",
        currentSemesterId: "sem-1",
        currentSemester: {
          id: "sem-1",
          name: "4th Year 2nd Semester",
          courses: [
            {
              id: "course-1",
              code: "CSE 404",
              name: "Software Engineering",
              teacher: { id: "teacher-1", name: "Dr. Faculty" },
            },
          ],
        },
      };

      (prisma.batch.findUnique as any).mockResolvedValue(mockBatch);
      (prisma.scheduleEntry.findMany as any)
        .mockResolvedValueOnce([
          {
            id: "entry-1",
            startTime: new Date(),
            endTime: new Date(),
            course: { id: "c-1", code: "CSE 404", name: "SE" },
            teacher: { id: "t-1", name: "Dr. Faculty" },
            room: { id: "r-1", roomNumber: "R-101" },
          },
        ]) // todaySchedule
        .mockResolvedValueOnce([
          {
            id: "ct-1",
            date: new Date(),
            course: { id: "c-1", code: "CSE 404", name: "SE" },
            teacher: { id: "t-1", name: "Dr. Faculty" },
            room: { id: "r-1", roomNumber: "R-101" },
          },
        ]) // upcomingCTs
        .mockResolvedValueOnce([]) // classCountEntries
        .mockResolvedValueOnce([]); // weekSchedule

      (prisma.assignment.findMany as any).mockResolvedValue([
        {
          id: "assign-1",
          title: "Assignment 1",
          dueDate: new Date(Date.now() + 86400000),
          course: { id: "c-1", code: "CSE 404", name: "SE" },
          teacher: { id: "t-1", name: "Dr. Faculty" },
        },
      ]);

      (prisma.cTMark.findMany as any).mockResolvedValue([
        {
          id: "mark-1",
          marksObtained: 18,
          maxMarks: 20,
          scheduleEntry: {
            courseId: "c-1",
            date: new Date(),
            topic: "Design Patterns",
            course: { id: "c-1", code: "CSE 404", name: "SE" },
          },
        },
      ]);

      const result = await dashboardService.getStudentDashboard("student-1", "batch-1");

      expect(result.batch.name).toBe("52nd");
      expect(result.semester?.name).toBe("4th Year 2nd Semester");
      expect(result.todaySchedule).toHaveLength(1);
      expect(result.upcomingCTs).toHaveLength(1);
      expect(result.upcomingAssignments).toHaveLength(1);
      expect(result.ctMarksGrouped).toHaveLength(1);
      expect(result.ctMarksGrouped[0].marks[0].marksObtained).toBe(18);
    });

    it("should throw 404 if batch not found", async () => {
      (prisma.batch.findUnique as any).mockResolvedValue(null);

      await expect(
        dashboardService.getStudentDashboard("student-1", "non-existent")
      ).rejects.toThrow("Batch not found");
    });
  });

  describe("getTeacherDashboard", () => {
    it("should return consolidated teacher dashboard data", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "teacher-1",
        name: "Dr. Teacher",
        teacherUniqueId: "T-001",
      });

      (prisma.scheduleEntry.findMany as any)
        .mockResolvedValueOnce([
          {
            id: "e-1",
            date: new Date(),
            startTime: new Date(),
            course: { id: "c-1", code: "CSE 404", name: "SE" },
            batch: { id: "b-1", name: "52nd" },
            room: { id: "r-1", roomNumber: "R-101" },
          },
        ]) // upcomingClasses
        .mockResolvedValueOnce([
          {
            batchId: "b-1",
            batch: { name: "52nd" },
          },
        ]) // classCountEntries
        .mockResolvedValueOnce([]); // todaySchedule

      (prisma.course.findMany as any).mockResolvedValue([
        {
          id: "c-1",
          code: "CSE 404",
          name: "Software Engineering",
          semester: {
            name: "4th Year 2nd Semester",
            batch: { id: "b-1", name: "52nd", program: "HONOURS", status: "ACTIVE" },
          },
        },
      ]);

      const result = await dashboardService.getTeacherDashboard("teacher-1");

      expect(result.teacher.name).toBe("Dr. Teacher");
      expect(result.teacher.teacherUniqueId).toBe("T-001");
      expect(result.upcomingClasses).toHaveLength(1);
      expect(result.assignedBatches).toHaveLength(1);
      expect(result.assignedBatches[0].name).toBe("52nd");
      expect(result.classCountByBatch).toEqual([
        { batchId: "b-1", batchName: "52nd", count: 1 },
      ]);
    });

    it("should throw 404 if teacher user not found", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        dashboardService.getTeacherDashboard("non-existent-teacher")
      ).rejects.toThrow("Teacher not found");
    });
  });

  describe("getAdminDashboard", () => {
    it("should return admin dashboard overview data", async () => {
      (prisma.user.count as any)
        .mockResolvedValueOnce(120) // totalStudents
        .mockResolvedValueOnce(15) // totalTeachers
        .mockResolvedValueOnce(3); // unverifiedUsers

      (prisma.batch.count as any).mockResolvedValue(4); // activeBatches
      (prisma.semester.count as any).mockResolvedValue(4); // activeSemesters
      (prisma.scheduleEntry.count as any).mockResolvedValue(28); // upcomingEvents

      (prisma.promotionRequest.findMany as any).mockResolvedValue([
        {
          id: "promo-1",
          status: "PENDING",
          batch: { id: "b-1", name: "52nd", program: "HONOURS" },
          semester: { id: "sem-1", name: "4th Year 1st Semester" },
          requestedBy: { id: "u-1", name: "CR Person", role: "CR" },
          createdAt: new Date(),
        },
      ]);

      (prisma.holiday.findMany as any).mockResolvedValue([
        {
          id: "hol-1",
          date: new Date(),
          reason: "National Holiday",
          scope: "ALL",
          batch: null,
        },
      ]);

      (prisma.scheduleEntry.findMany as any).mockResolvedValue([
        {
          roomId: "r-1",
          room: { roomNumber: "R-101", type: "CLASSROOM" },
          startTime: new Date(),
          endTime: new Date(),
          type: "CLASS",
          course: { code: "CSE 404", name: "SE" },
          batch: { name: "52nd" },
        },
      ]);

      (prisma.auditLog.findMany as any).mockResolvedValue([
        {
          id: "log-1",
          action: "RESCHEDULE_CLASS",
          entityType: "ScheduleEntry",
          entityId: "e-1",
          details: {},
          createdAt: new Date(),
          user: { id: "u-1", name: "Admin", role: "ADMIN" },
        },
      ]);

      const result = await dashboardService.getAdminDashboard();

      expect(result.systemOverview.totalStudents).toBe(120);
      expect(result.systemOverview.totalTeachers).toBe(15);
      expect(result.systemOverview.activeBatches).toBe(4);
      expect(result.systemOverview.activeSemesters).toBe(4);
      expect(result.systemOverview.unverifiedUsers).toBe(3);
      expect(result.systemOverview.upcomingEvents).toBe(28);
      expect(result.pendingPromotions).toHaveLength(1);
      expect(result.upcomingHolidays).toHaveLength(1);
      expect(result.todayRoomUsage).toHaveLength(1);
      expect(result.auditLogs).toHaveLength(1);
    });
  });
});
