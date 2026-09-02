import { prisma } from "../lib/prisma.js";
import { ScheduleEntryStatus, ScheduleEntryType, Role } from "@prisma/client";
import { AppError } from "../middleware/errorHandler.js";
import { AuthUser } from "../middleware/auth.js";
import { conflictService } from "./conflictService.js";
import {
  normalizeDateString,
  timeToMinutes,
  minutesToTimeString,
  formatTime12h,
} from "../utils/timeUtils.js";

export interface GetScheduleFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  batchId?: string;
  teacherId?: string;
  roomId?: string;
  status?: ScheduleEntryStatus;
  type?: ScheduleEntryType;
}

export interface RescheduleClassInput {
  date: string | Date;
  startTime: string | Date;
  endTime: string | Date;
  roomId?: string;
  reason?: string;
}

export interface UpdateClassTimeInput {
  startTime: string | Date;
  endTime: string | Date;
  reason?: string;
}

export interface CancelClassInput {
  reason?: string;
}

export interface GenerateRoutineTemplateItem {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JU standard week)
  courseId: string;
  teacherId: string;
  roomId: string;
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  type?: ScheduleEntryType;
}

export interface GenerateRoutineInput {
  batchId: string;
  semesterId: string;
  startDate: string | Date;
  endDate: string | Date;
  template: GenerateRoutineTemplateItem[];
}

export class ScheduleService {
  /**
   * Fetch schedule entries with filters.
   */
  async getSchedule(filters: GetScheduleFilter = {}) {
    const where: any = {};

    if (filters.date) {
      where.date = new Date(normalizeDateString(filters.date));
    } else if (filters.startDate && filters.endDate) {
      where.date = {
        gte: new Date(normalizeDateString(filters.startDate)),
        lte: new Date(normalizeDateString(filters.endDate)),
      };
    }

    if (filters.batchId) where.batchId = filters.batchId;
    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.roomId) where.roomId = filters.roomId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return await prisma.scheduleEntry.findMany({
      where,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: {
        course: { select: { id: true, name: true, code: true, creditHours: true } },
        teacher: { select: { id: true, name: true, email: true, teacherUniqueId: true } },
        room: { select: { id: true, roomNumber: true, type: true, description: true } },
        batch: { select: { id: true, name: true, program: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Fetch personalized schedule entries for current actor.
   */
  async getMySchedule(actor: AuthUser, filters: GetScheduleFilter = {}) {
    if (actor.role === Role.STUDENT || actor.role === Role.CR) {
      if (!actor.batchId) {
        throw new AppError("Student user is not assigned to a batch", 400, "BAD_REQUEST");
      }
      return this.getSchedule({ ...filters, batchId: actor.batchId });
    }

    if (actor.role === Role.TEACHER) {
      return this.getSchedule({ ...filters, teacherId: actor.id });
    }

    // Admin gets general schedule
    return this.getSchedule(filters);
  }

  /**
   * Get single schedule entry by ID with validation.
   */
  async getScheduleById(id: string) {
    const entry = await prisma.scheduleEntry.findUnique({
      where: { id },
      include: {
        course: true,
        teacher: true,
        room: true,
        batch: true,
        createdBy: true,
      },
    });

    if (!entry) {
      throw new AppError("Schedule entry not found", 404, "NOT_FOUND");
    }

    return entry;
  }

  /**
   * Reschedule a class to a new date, time, and/or room with 3-way transactional conflict checking (FR-17).
   */
  async rescheduleClass(id: string, payload: RescheduleClassInput, actor: AuthUser) {
    const entry = await this.getScheduleById(id);

    // RBAC & Ownership check: Admin or the assigned Teacher
    this.assertCanModifyEntry(entry, actor);

    if (entry.status === ScheduleEntryStatus.CANCELLED) {
      throw new AppError("Cannot reschedule a cancelled class slot.", 400, "INVALID_OPERATION");
    }
    if (entry.status === ScheduleEntryStatus.HOLIDAY) {
      throw new AppError(
        "Cannot reschedule a class falling on a declared holiday.",
        400,
        "INVALID_OPERATION"
      );
    }

    const targetDateStr = normalizeDateString(payload.date);
    const targetRoomId = payload.roomId || entry.roomId;
    const targetStartTime = payload.startTime;
    const targetEndTime = payload.endTime;

    // Check 3-way conflict in database transaction
    return await prisma.$transaction(async (tx) => {
      const conflictResult = await conflictService.checkConflict(
        {
          date: targetDateStr,
          startTime: targetStartTime,
          endTime: targetEndTime,
          roomId: targetRoomId,
          teacherId: entry.teacherId,
          batchId: entry.batchId,
          excludeScheduleEntryId: id,
        },
        tx
      );

      if (conflictResult.hasConflict) {
        throw new AppError(
          conflictResult.summaryMessage || "Scheduling conflict detected",
          409,
          "CONFLICT_DETECTED",
          conflictResult
        );
      }

      // Convert time to standard UTC date instance for storage
      const parsedDate = new Date(targetDateStr);
      const startMinutes = timeToMinutes(targetStartTime);
      const endMinutes = timeToMinutes(targetEndTime);

      const startDateTime = new Date(parsedDate);
      startDateTime.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endDateTime = new Date(parsedDate);
      endDateTime.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      // Update schedule entry
      const updated = await tx.scheduleEntry.update({
        where: { id },
        data: {
          date: parsedDate,
          startTime: startDateTime,
          endTime: endDateTime,
          roomId: targetRoomId,
          status: ScheduleEntryStatus.RESCHEDULED,
        },
        include: {
          course: true,
          teacher: true,
          room: true,
          batch: true,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "RESCHEDULE_CLASS",
          entityType: "ScheduleEntry",
          entityId: id,
          ipAddress: "127.0.0.1",
          details: {
            previous: {
              date: normalizeDateString(entry.date),
              roomId: entry.roomId,
            },
            updated: {
              date: targetDateStr,
              roomId: targetRoomId,
              startTime: minutesToTimeString(startMinutes),
              endTime: minutesToTimeString(endMinutes),
              reason: payload.reason,
            },
          },
        },
      });

      // Create in-app notifications for batch students
      const students = await tx.user.findMany({
        where: { batchId: entry.batchId },
        select: { id: true },
      });

      if (students.length > 0) {
        const notifMessage = `Class for ${entry.course?.name || "course"} has been rescheduled to ${targetDateStr} (${formatTime12h(targetStartTime)} - ${formatTime12h(targetEndTime)}) in ${updated.room.roomNumber}.`;
        await tx.notification.createMany({
          data: students.map((s) => ({
            userId: s.id,
            type: "CLASS_RESCHEDULED",
            message: notifMessage,
            relatedEntityType: "ScheduleEntry",
            relatedEntityId: id,
          })),
        });
      }

      return updated;
    });
  }

  /**
   * Change time of scheduled class on the same day (FR-16).
   */
  async updateClassTime(id: string, payload: UpdateClassTimeInput, actor: AuthUser) {
    const entry = await this.getScheduleById(id);
    return this.rescheduleClass(
      id,
      {
        date: entry.date,
        startTime: payload.startTime,
        endTime: payload.endTime,
        roomId: entry.roomId,
        reason: payload.reason,
      },
      actor
    );
  }

  /**
   * Cancel a scheduled class instance (FR-15).
   */
  async cancelClass(id: string, payload: CancelClassInput = {}, actor: AuthUser) {
    const entry = await this.getScheduleById(id);

    // RBAC & Ownership
    this.assertCanModifyEntry(entry, actor);

    if (entry.status === ScheduleEntryStatus.CANCELLED) {
      throw new AppError("Class is already cancelled", 400, "ALREADY_CANCELLED");
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.scheduleEntry.update({
        where: { id },
        data: {
          status: ScheduleEntryStatus.CANCELLED,
        },
        include: {
          course: true,
          teacher: true,
          room: true,
          batch: true,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "CANCEL_CLASS",
          entityType: "ScheduleEntry",
          entityId: id,
          ipAddress: "127.0.0.1",
          details: {
            date: normalizeDateString(entry.date),
            courseId: entry.courseId,
            reason: payload.reason || "Class cancelled by instructor/admin",
          },
        },
      });

      // Notify batch students
      const students = await tx.user.findMany({
        where: { batchId: entry.batchId },
        select: { id: true },
      });

      if (students.length > 0) {
        const notifMessage = `Class for ${entry.course?.name || "course"} scheduled on ${normalizeDateString(entry.date)} (${formatTime12h(entry.startTime)} - ${formatTime12h(entry.endTime)}) has been cancelled.`;
        await tx.notification.createMany({
          data: students.map((s) => ({
            userId: s.id,
            type: "CLASS_CANCELLED",
            message: notifMessage,
            relatedEntityType: "ScheduleEntry",
            relatedEntityId: id,
          })),
        });
      }

      return updated;
    });
  }

  /**
   * Room availability matrix for all 8 fixed rooms on a given date (FR-13).
   */
  async getRoomAvailability(date: string | Date, roomId?: string) {
    const targetDate = new Date(normalizeDateString(date));
    const targetDateStr = normalizeDateString(date);

    // Standard department time slots
    const STANDARD_SLOTS = [
      { startTime: "08:30", endTime: "10:00", label: "8:30 AM - 10:00 AM" },
      { startTime: "10:00", endTime: "11:30", label: "10:00 AM - 11:30 AM" },
      { startTime: "11:30", endTime: "13:00", label: "11:30 AM - 1:00 PM" },
      { startTime: "13:30", endTime: "15:00", label: "1:30 PM - 3:00 PM" },
      { startTime: "15:00", endTime: "16:30", label: "3:00 PM - 4:30 PM" },
    ];

    const roomWhere: any = {};
    if (roomId) roomWhere.id = roomId;

    const rooms = await prisma.room.findMany({
      where: roomWhere,
      orderBy: { roomNumber: "asc" },
    });

    const entries = await prisma.scheduleEntry.findMany({
      where: {
        date: targetDate,
        status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
        ...(roomId ? { roomId } : {}),
      },
      include: {
        course: { select: { name: true, code: true } },
        teacher: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    const matrix = rooms.map((room) => {
      const roomEntries = entries.filter((e) => e.roomId === room.id);

      const slots = STANDARD_SLOTS.map((slot) => {
        const bookedEntry = roomEntries.find((e) =>
          conflictService.checkOverlap(slot.startTime, slot.endTime, e.startTime, e.endTime)
        );

        return {
          ...slot,
          isAvailable: !bookedEntry,
          booking: bookedEntry
            ? {
                id: bookedEntry.id,
                courseName: bookedEntry.course?.name,
                courseCode: bookedEntry.course?.code,
                teacherName: bookedEntry.teacher?.name,
                batchName: bookedEntry.batch?.name,
                type: bookedEntry.type,
              }
            : null,
        };
      });

      return {
        room,
        date: targetDateStr,
        slots,
      };
    });

    return matrix;
  }

  /**
   * Day-Wise Routine Generation across semester date range (FR-10).
   */
  async generateRoutine(input: GenerateRoutineInput, actor: AuthUser) {
    if (actor.role !== Role.ADMIN) {
      throw new AppError("Only administrators can generate routine schedules.", 403, "FORBIDDEN");
    }

    const start = new Date(normalizeDateString(input.startDate));
    const end = new Date(normalizeDateString(input.endDate));

    if (start > end) {
      throw new AppError("startDate cannot be after endDate", 400, "VALIDATION_ERROR");
    }

    // Fetch pre-declared holidays in date range
    const holidays = await prisma.holiday.findMany({
      where: {
        date: { gte: start, lte: end },
        OR: [{ scope: "ALL" }, { batchId: input.batchId }],
      },
    });

    const holidayDateSet = new Set(holidays.map((h) => normalizeDateString(h.date)));

    const createdEntries: any[] = [];
    const curr = new Date(start);

    // Replicate weekly template across date range in transaction
    await prisma.$transaction(async (tx) => {
      while (curr <= end) {
        const dateStr = normalizeDateString(curr);
        const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

        // Skip holidays and Friday (standard university off day in BD, 5) if desired
        if (!holidayDateSet.has(dateStr)) {
          const dayTemplates = input.template.filter((t) => t.dayOfWeek === dayOfWeek);

          for (const item of dayTemplates) {
            // Check conflict
            const conflict = await conflictService.checkConflict(
              {
                date: dateStr,
                startTime: item.startTime,
                endTime: item.endTime,
                roomId: item.roomId,
                teacherId: item.teacherId,
                batchId: input.batchId,
              },
              tx
            );

            if (!conflict.hasConflict) {
              const startMinutes = timeToMinutes(item.startTime);
              const endMinutes = timeToMinutes(item.endTime);

              const startDateTime = new Date(curr);
              startDateTime.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

              const endDateTime = new Date(curr);
              endDateTime.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

              const newEntry = await tx.scheduleEntry.create({
                data: {
                  type: item.type || ScheduleEntryType.CLASS,
                  status: ScheduleEntryStatus.SCHEDULED,
                  courseId: item.courseId,
                  batchId: input.batchId,
                  teacherId: item.teacherId,
                  roomId: item.roomId,
                  date: new Date(curr),
                  startTime: startDateTime,
                  endTime: endDateTime,
                  createdById: actor.id,
                },
              });
              createdEntries.push(newEntry);
            }
          }
        }

        // Increment day
        curr.setDate(curr.getDate() + 1);
      }

      // Log Audit
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "GENERATE_ROUTINE",
          entityType: "ScheduleEntry",
          entityId: input.batchId,
          ipAddress: "127.0.0.1",
          details: {
            batchId: input.batchId,
            semesterId: input.semesterId,
            generatedCount: createdEntries.length,
            startDate: normalizeDateString(input.startDate),
            endDate: normalizeDateString(input.endDate),
          },
        },
      });
    });

    return {
      generatedCount: createdEntries.length,
      message: `Generated ${createdEntries.length} schedule entries successfully.`,
    };
  }

  /**
   * Helper to verify ownership or admin privilege.
   */
  private assertCanModifyEntry(entry: any, actor: AuthUser) {
    if (actor.role === Role.ADMIN) {
      return;
    }

    if (actor.role === Role.TEACHER) {
      const isOwner =
        entry.teacherId === actor.id ||
        (actor.teacherUniqueId && entry.teacher?.teacherUniqueId === actor.teacherUniqueId);

      if (isOwner) {
        return;
      }
    }

    throw new AppError(
      "You do not have permission to modify this class schedule.",
      403,
      "FORBIDDEN"
    );
  }

  /**
   * Tracks class counts for students and teachers (SN-05, TN-10).
   * - Student/CR view: Classes conducted per course per teacher (SN-05).
   * - Teacher view: Classes taken per batch (TN-10).
   */
  async getClassCounts(actor: AuthUser, query: { batchId?: string; teacherId?: string } = {}) {
    const isStudentOrCr = actor.role === Role.STUDENT || actor.role === Role.CR;

    if (isStudentOrCr) {
      let targetBatchId = query.batchId;
      let batchName = "Batch";

      if (!targetBatchId) {
        const user = await prisma.user.findUnique({
          where: { id: actor.userId || actor.id },
          include: { batch: true },
        });
        targetBatchId = user?.batchId || undefined;
        batchName = user?.batch?.name || "Batch";
      }

      if (!targetBatchId) {
        return {
          role: actor.role,
          batchId: null,
          batchName: null,
          courses: [],
          totalConducted: 0,
        };
      }

      const entries = await prisma.scheduleEntry.findMany({
        where: {
          batchId: targetBatchId,
          status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
        },
        include: {
          course: { select: { id: true, code: true, name: true } },
          teacher: { select: { id: true, name: true } },
          batch: { select: { id: true, name: true } },
        },
      });

      if (entries.length > 0 && entries[0].batch?.name) {
        batchName = entries[0].batch.name;
      }

      const courseMap = new Map<
        string,
        {
          courseId: string;
          courseCode: string;
          courseName: string;
          teacherMap: Map<string, { teacherId: string; teacherName: string; classCount: number }>;
          totalClasses: number;
        }
      >();

      for (const entry of entries) {
        const courseId = entry.courseId || "__no_course__";
        const courseCode = entry.course?.code || "N/A";
        const courseName = entry.course?.name || "Unassigned Course";

        if (!courseMap.has(courseId)) {
          courseMap.set(courseId, {
            courseId,
            courseCode,
            courseName,
            teacherMap: new Map(),
            totalClasses: 0,
          });
        }

        const courseData = courseMap.get(courseId)!;
        courseData.totalClasses++;

        const teacherId = entry.teacherId || "__no_teacher__";
        const teacherName = entry.teacher?.name || "Unassigned Teacher";

        if (!courseData.teacherMap.has(teacherId)) {
          courseData.teacherMap.set(teacherId, {
            teacherId,
            teacherName,
            classCount: 0,
          });
        }
        courseData.teacherMap.get(teacherId)!.classCount++;
      }

      const courses = Array.from(courseMap.values()).map((c) => ({
        courseId: c.courseId,
        courseCode: c.courseCode,
        courseName: c.courseName,
        totalClasses: c.totalClasses,
        teachers: Array.from(c.teacherMap.values()),
      }));

      return {
        role: actor.role,
        batchId: targetBatchId,
        batchName,
        courses,
        totalConducted: entries.length,
      };
    }

    // Teacher View (TN-10) or Admin View
    const targetTeacherId =
      actor.role === Role.TEACHER ? actor.userId || actor.id : query.teacherId;

    const whereClause: any = {
      status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
    };
    if (targetTeacherId) {
      whereClause.teacherId = targetTeacherId;
    }
    if (query.batchId) {
      whereClause.batchId = query.batchId;
    }

    const entries = await prisma.scheduleEntry.findMany({
      where: whereClause,
      include: {
        batch: { select: { id: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
      },
    });

    const batchMap = new Map<
      string,
      {
        batchId: string;
        batchName: string;
        courseCode: string;
        courseName: string;
        classCount: number;
      }
    >();

    for (const entry of entries) {
      const key = `${entry.batchId}_${entry.courseId}`;
      if (!batchMap.has(key)) {
        batchMap.set(key, {
          batchId: entry.batchId,
          batchName: entry.batch?.name || "N/A",
          courseCode: entry.course?.code || "N/A",
          courseName: entry.course?.name || "N/A",
          classCount: 0,
        });
      }
      batchMap.get(key)!.classCount++;
    }

    return {
      role: actor.role,
      teacherId: targetTeacherId,
      batches: Array.from(batchMap.values()),
      totalClassesTaken: entries.length,
    };
  }
}

export const scheduleService = new ScheduleService();
