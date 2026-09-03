import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { ScheduleEntryStatus, ScheduleEntryType } from "@prisma/client";
import { normalizeDateString } from "../utils/timeUtils.js";

/**
 * Dashboard service providing role-specific aggregated data views (FR-28, FR-29, FR-30).
 */
export class DashboardService {
  /**
   * Student Dashboard (FR-28): Personalized to student's batch and current semester.
   */
  async getStudentDashboard(userId: string, batchId: string) {
    // Resolve batch and current semester
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        currentSemester: {
          include: {
            courses: {
              include: {
                teacher: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!batch) {
      throw new AppError("Batch not found", 404, "BATCH_NOT_FOUND");
    }

    const semesterId = batch.currentSemesterId;
    const today = new Date();
    const todayStr = normalizeDateString(today);
    const todayDate = new Date(todayStr);

    // 1. Today's Schedule
    const todaySchedule = await prisma.scheduleEntry.findMany({
      where: {
        batchId,
        date: todayDate,
        status: { notIn: [ScheduleEntryStatus.CANCELLED] },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: { startTime: "asc" },
    });

    // 2. Upcoming CTs (next 30 days)
    const upcomingCTs = await prisma.scheduleEntry.findMany({
      where: {
        batchId,
        type: ScheduleEntryType.CT,
        date: { gte: todayDate },
        status: { notIn: [ScheduleEntryStatus.CANCELLED] },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: { date: "asc" },
      take: 10,
    });

    // 3. Upcoming Assignments
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        batchId,
        dueDate: { gte: today },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    });

    // 4. CT Marks for current semester (grouped by course)
    const ctMarks = await prisma.cTMark.findMany({
      where: { studentId: userId },
      include: {
        scheduleEntry: {
          include: {
            course: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    // Group CT marks by course
    const ctMarksByCourse = new Map<string, Array<typeof ctMarks[0]>>();
    for (const mark of ctMarks) {
      const courseId = mark.scheduleEntry.courseId || "unknown";
      if (!ctMarksByCourse.has(courseId)) {
        ctMarksByCourse.set(courseId, []);
      }
      ctMarksByCourse.get(courseId)!.push(mark);
    }

    const ctMarksGrouped = Array.from(ctMarksByCourse.entries()).map(([courseId, marks]) => ({
      courseId,
      courseCode: marks[0]?.scheduleEntry.course?.code || null,
      courseName: marks[0]?.scheduleEntry.course?.name || null,
      marks: marks.map((m) => ({
        id: m.id,
        marksObtained: m.marksObtained,
        maxMarks: m.maxMarks,
        date: m.scheduleEntry.date,
        topic: m.scheduleEntry.topic,
      })),
    }));

    // 5. Class Count per course×teacher for the current semester
    const classCountEntries = semesterId
      ? await prisma.scheduleEntry.findMany({
          where: {
            batchId,
            type: ScheduleEntryType.CLASS,
            status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
            course: { semesterId },
          },
          select: {
            courseId: true,
            teacherId: true,
            course: { select: { code: true, name: true } },
            teacher: { select: { name: true } },
          },
        })
      : [];

    // Aggregate class counts
    const classCountMap = new Map<string, { courseCode: string; courseName: string; teacherName: string; count: number }>();
    for (const entry of classCountEntries) {
      const key = `${entry.courseId}-${entry.teacherId}`;
      const existing = classCountMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        classCountMap.set(key, {
          courseCode: entry.course?.code || "",
          courseName: entry.course?.name || "",
          teacherName: entry.teacher.name,
          count: 1,
        });
      }
    }

    // 6. Week schedule (next 7 days) for calendar view
    const weekEnd = new Date(todayDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekSchedule = await prisma.scheduleEntry.findMany({
      where: {
        batchId,
        date: { gte: todayDate, lte: weekEnd },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        teacher: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return {
      batch: { id: batch.id, name: batch.name, program: batch.program },
      semester: batch.currentSemester
        ? { id: batch.currentSemester.id, name: batch.currentSemester.name }
        : null,
      todaySchedule,
      weekSchedule,
      upcomingCTs,
      upcomingAssignments: upcomingAssignments.map((a) => ({
        ...a,
        status: a.dueDate.getTime() - Date.now() <= 24 * 60 * 60 * 1000 ? "DUE_SOON" : "UPCOMING",
      })),
      ctMarksGrouped,
      classCount: Array.from(classCountMap.values()),
      courses: batch.currentSemester?.courses || [],
    };
  }

  /**
   * Teacher Dashboard (FR-29): Consolidated view across all assigned batches.
   */
  async getTeacherDashboard(userId: string) {
    const teacher = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, teacherUniqueId: true },
    });

    if (!teacher) {
      throw new AppError("Teacher not found", 404, "USER_NOT_FOUND");
    }

    const today = new Date();
    const todayStr = normalizeDateString(today);
    const todayDate = new Date(todayStr);

    // 1. General Board: All upcoming classes across all batches
    const upcomingClasses = await prisma.scheduleEntry.findMany({
      where: {
        teacherId: userId,
        date: { gte: todayDate },
        status: { notIn: [ScheduleEntryStatus.CANCELLED] },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        batch: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 20,
    });

    // 2. Assigned batches (via courses the teacher teaches)
    const courses = await prisma.course.findMany({
      where: { teacherId: userId },
      include: {
        semester: {
          include: {
            batch: { select: { id: true, name: true, program: true, status: true } },
          },
        },
      },
    });

    // Deduplicate batches
    const batchMap = new Map<string, {
      id: string;
      name: string;
      program: string;
      courses: Array<{ id: string; code: string; name: string; semesterName: string }>;
    }>();

    for (const course of courses) {
      const b = course.semester.batch;
      if (!batchMap.has(b.id)) {
        batchMap.set(b.id, {
          id: b.id,
          name: b.name,
          program: b.program,
          courses: [],
        });
      }
      batchMap.get(b.id)!.courses.push({
        id: course.id,
        code: course.code,
        name: course.name,
        semesterName: course.semester.name,
      });
    }

    const assignedBatches = Array.from(batchMap.values());

    // 3. Class count per batch for current semester
    const classCountEntries = await prisma.scheduleEntry.findMany({
      where: {
        teacherId: userId,
        type: ScheduleEntryType.CLASS,
        status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
      },
      select: {
        batchId: true,
        batch: { select: { name: true } },
      },
    });

    const classCountByBatch = new Map<string, { batchName: string; count: number }>();
    for (const entry of classCountEntries) {
      const existing = classCountByBatch.get(entry.batchId);
      if (existing) {
        existing.count++;
      } else {
        classCountByBatch.set(entry.batchId, {
          batchName: entry.batch.name,
          count: 1,
        });
      }
    }

    // 4. Today's schedule for the teacher
    const todaySchedule = await prisma.scheduleEntry.findMany({
      where: {
        teacherId: userId,
        date: todayDate,
        status: { notIn: [ScheduleEntryStatus.CANCELLED] },
      },
      include: {
        course: { select: { id: true, code: true, name: true } },
        batch: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return {
      teacher: {
        id: teacher.id,
        name: teacher.name,
        teacherUniqueId: teacher.teacherUniqueId,
      },
      todaySchedule,
      upcomingClasses,
      assignedBatches,
      classCountByBatch: Array.from(classCountByBatch.entries()).map(([batchId, data]) => ({
        batchId,
        ...data,
      })),
    };
  }

  /**
   * Admin Dashboard (FR-30): System-wide overview.
   */
  async getAdminDashboard() {
    const today = new Date();
    const todayStr = normalizeDateString(today);
    const todayDate = new Date(todayStr);

    // 1. System Overview totals
    const [
      totalStudents,
      totalTeachers,
      activeBatches,
      activeSemesters,
      unverifiedUsers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { in: ["STUDENT", "CR"] } } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.batch.count({ where: { status: "ACTIVE" } }),
      prisma.semester.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { isVerified: false } }),
    ]);

    // 2. Upcoming events (next 7 days)
    const weekEnd = new Date(todayDate);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const upcomingEvents = await prisma.scheduleEntry.count({
      where: {
        date: { gte: todayDate, lte: weekEnd },
        status: { notIn: [ScheduleEntryStatus.CANCELLED] },
      },
    });

    // 3. Pending Actions
    const pendingPromotions = await prisma.promotionRequest.findMany({
      where: { status: "PENDING" },
      include: {
        batch: { select: { id: true, name: true, program: true } },
        semester: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 4. Holiday Calendar: Next 5 upcoming holidays
    const upcomingHolidays = await prisma.holiday.findMany({
      where: { date: { gte: todayDate } },
      orderBy: { date: "asc" },
      take: 5,
      include: {
        batch: { select: { id: true, name: true } },
      },
    });

    // 5. Room allocation for today
    const todayRoomUsage = await prisma.scheduleEntry.findMany({
      where: {
        date: todayDate,
        status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
      },
      select: {
        roomId: true,
        room: { select: { roomNumber: true, type: true } },
        startTime: true,
        endTime: true,
        type: true,
        course: { select: { code: true, name: true } },
        batch: { select: { name: true } },
      },
      orderBy: [{ roomId: "asc" }, { startTime: "asc" }],
    });

    // 6. Audit Log Feed: Last 20 entries
    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      systemOverview: {
        totalStudents,
        totalTeachers,
        activeBatches,
        activeSemesters,
        upcomingEvents,
        unverifiedUsers,
      },
      pendingPromotions,
      upcomingHolidays,
      todayRoomUsage,
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        createdAt: log.createdAt,
        user: log.user,
      })),
    };
  }
}

export const dashboardService = new DashboardService();
