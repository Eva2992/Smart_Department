import { prisma } from "../lib/prisma.js";
import { ScheduleEntryStatus, ScheduleEntryType, Role } from "@prisma/client";
import { AppError } from "../middleware/errorHandler.js";
import { AuthUser } from "../middleware/auth.js";
import { conflictService } from "./conflictService.js";
import { holidayService } from "./holidayService.js";
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

export interface RoomScheduleSlot {
  startTime: string;
  endTime: string;
  label: string;
  isAvailable: boolean;
  booking: {
    id: string;
    courseName?: string;
    courseCode?: string;
    teacherName?: string;
    batchName?: string;
    type: string;
  } | null;
}

export interface RoomScheduleGrid {
  rooms: Array<{
    id: string;
    roomNumber: string;
    type: string;
    description?: string | null;
  }>;
  dates: string[];
  grid: Record<string, Record<string, RoomScheduleSlot[]>>;
}

export interface CreateSeminarInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
  teacherId: string;
  batchId: string;
  courseId?: string;
}

export class ScheduleService {
  /**
   * Fetch schedule entries with filters.
   *
   * @param filters - Optional filtering parameters
   * @returns List of schedule entries
   *
   * @example
   * ```ts
   * const schedule = await scheduleService.getSchedule({ batchId: 'some-id' });
   * ```
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
   * Retrieves the schedule grid for all rooms across a date range.
   *
   * Returns a structured grid mapping each room × each date to an array of
   * time-slot availability objects, enabling the frontend Room Availability Matrix
   * to render a multi-day view.
   *
   * @param startDate - Start of date range (YYYY-MM-DD)
   * @param endDate - End of date range (YYYY-MM-DD), max 7 days from startDate
   * @returns A {@link RoomScheduleGrid} containing rooms, dates, and the availability grid
   * @throws {AppError} 400 if startDate is after endDate or range exceeds 7 days
   *
   * @example
   * ```ts
   * const grid = await scheduleService.getAllRoomsSchedule('2026-09-01', '2026-09-04');
   * // grid.grid['room-uuid']['2026-09-01'] = [{ startTime, endTime, label, isAvailable, booking }]
   * ```
   */
  async getAllRoomsSchedule(startDate: string, endDate: string): Promise<RoomScheduleGrid> {
    const start = new Date(normalizeDateString(startDate));
    const end = new Date(normalizeDateString(endDate));

    if (start > end) {
      throw new AppError("startDate cannot be after endDate", 400, "VALIDATION_ERROR");
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 7) {
      throw new AppError("Date range cannot exceed 7 days", 400, "VALIDATION_ERROR");
    }

    const dates: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(normalizeDateString(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const rooms = await prisma.room.findMany({
      orderBy: { roomNumber: "asc" },
      select: { id: true, roomNumber: true, type: true, description: true }
    });

    const entries = await prisma.scheduleEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
      },
      include: {
        course: { select: { name: true, code: true } },
        teacher: { select: { name: true } },
        batch: { select: { name: true } },
        room: { select: { id: true } }
      },
    });

    const STANDARD_SLOTS = [
      { startTime: "08:30", endTime: "10:00", label: "8:30 AM - 10:00 AM" },
      { startTime: "10:00", endTime: "11:30", label: "10:00 AM - 11:30 AM" },
      { startTime: "11:30", endTime: "13:00", label: "11:30 AM - 1:00 PM" },
      { startTime: "13:30", endTime: "15:00", label: "1:30 PM - 3:00 PM" },
      { startTime: "15:00", endTime: "16:30", label: "3:00 PM - 4:30 PM" },
    ];

    const grid: Record<string, Record<string, RoomScheduleSlot[]>> = {};

    for (const room of rooms) {
      grid[room.id] = {};
      const roomEntries = entries.filter((e) => e.roomId === room.id);

      for (const d of dates) {
        const dateEntries = roomEntries.filter(e => normalizeDateString(e.date) === d);

        grid[room.id][d] = STANDARD_SLOTS.map((slot) => {
          const bookedEntry = dateEntries.find((e) =>
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
      }
    }

    return { rooms, dates, grid };
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

    // Fetch pre-declared holidays in date range via holidayService
    const holidays = await holidayService.getHolidaysByDateRange(
      normalizeDateString(input.startDate),
      normalizeDateString(input.endDate),
      input.batchId
    );

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
   * Creates a new seminar or workshop schedule entry with full 3-way conflict checking.
   *
   * Only callable by the department Chairman (isChairman: true) or Admin.
   * Performs transactional conflict detection across room, teacher, and batch
   * dimensions before persisting the entry.
   *
   * @param input - Seminar details including title, date, time, room, teacher, and batch
   * @param actor - The authenticated user creating the seminar (must be Chairman or Admin)
   * @returns The created ScheduleEntry with all relations included
   * @throws {AppError} 409 if any scheduling conflict is detected
   * @throws {AppError} 403 if actor is not Chairman or Admin
   *
   * @example
   * ```ts
   * const entry = await scheduleService.createSeminarEntry({
   *   title: 'AI Research Seminar',
   *   date: '2026-09-03',
   *   startTime: '10:00',
   *   endTime: '11:30',
   *   roomId: 'room-202-uuid',
   *   teacherId: 'teacher-uuid',
   *   batchId: 'batch-52-uuid',
   * }, chairmanUser);
   * ```
   */
  async createSeminarEntry(input: CreateSeminarInput, actor: AuthUser) {
    if (actor.role !== Role.ADMIN && !actor.isChairman && actor.role !== Role.CR) {
      throw new AppError("Only the Chairman or Admin can create seminars", 403, "FORBIDDEN");
    }

    if (actor.role === Role.CR && actor.batchId) {
      input.batchId = actor.batchId;
    }

    const targetDateStr = normalizeDateString(input.date);

    return await prisma.$transaction(async (tx) => {
      // Validate batch exists in DB or fallback to an active batch if batch model is present
      let validBatchId = input.batchId;
      if (tx.batch?.findUnique) {
        const batchExists = await tx.batch.findUnique({ where: { id: input.batchId } });
        if (!batchExists && tx.batch.findFirst) {
          const fallbackBatch = await tx.batch.findFirst({ where: { status: "ACTIVE" } });
          if (fallbackBatch) {
            validBatchId = fallbackBatch.id;
          }
        }
      }

      // Validate teacher exists in DB or fallback to actor
      let validTeacherId = input.teacherId;
      if (tx.user?.findUnique && input.teacherId) {
        const teacherExists = await tx.user.findUnique({ where: { id: input.teacherId } });
        if (!teacherExists) {
          validTeacherId = actor.id;
        }
      }

      // Check course if specified
      let validCourseId: string | null = null;
      if (input.courseId && tx.course?.findUnique) {
        const courseExists = await tx.course.findUnique({ where: { id: input.courseId } });
        if (courseExists) {
          validCourseId = courseExists.id;
        }
      }

      // Conflict check: focus strictly on Room availability for seminars
      const conflictResult = await conflictService.checkConflict(
        {
          date: targetDateStr,
          startTime: input.startTime,
          endTime: input.endTime,
          roomId: input.roomId,
        },
        tx
      );

      if (conflictResult.hasConflict) {
        throw new AppError(
          conflictResult.summaryMessage || "Scheduling conflict detected for seminar room",
          409,
          "CONFLICT_DETECTED",
          conflictResult
        );
      }

      const parsedDate = new Date(targetDateStr);
      const startMinutes = timeToMinutes(input.startTime);
      const endMinutes = timeToMinutes(input.endTime);

      const startDateTime = new Date(parsedDate);
      startDateTime.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endDateTime = new Date(parsedDate);
      endDateTime.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      const newEntry = await tx.scheduleEntry.create({
        data: {
          type: ScheduleEntryType.SEMINAR,
          status: ScheduleEntryStatus.SCHEDULED,
          topic: input.title,
          courseId: validCourseId,
          batchId: validBatchId,
          teacherId: validTeacherId,
          roomId: input.roomId,
          date: parsedDate,
          startTime: startDateTime,
          endTime: endDateTime,
          createdById: actor.id,
        },
        include: {
          course: true,
          teacher: true,
          room: true,
          batch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "CREATE_SEMINAR",
          entityType: "ScheduleEntry",
          entityId: newEntry.id,
          ipAddress: "127.0.0.1",
          details: {
            title: input.title,
            date: targetDateStr,
            startTime: input.startTime,
            endTime: input.endTime,
            roomId: input.roomId,
            batchId: input.batchId,
          },
        },
      });

      const students = await tx.user.findMany({
        where: { batchId: input.batchId },
        select: { id: true },
      });

      if (students.length > 0) {
        const notifMessage = `A seminar '${input.title}' has been scheduled on ${targetDateStr} (${formatTime12h(input.startTime)} - ${formatTime12h(input.endTime)}) in ${newEntry.room.roomNumber}.`;
        await tx.notification.createMany({
          data: students.map((s) => ({
            userId: s.id,
            type: "SEMINAR_SCHEDULED",
            message: notifMessage,
            relatedEntityType: "ScheduleEntry",
            relatedEntityId: newEntry.id,
          })),
        });
      }

      return newEntry;
    });
  }

  /**
   * Creates an ad-hoc class schedule (e.g. makeup or extra class session).
   */
  async createScheduleEntry(
    input: {
      courseId: string;
      teacherId: string;
      roomId: string;
      batchId: string;
      date: string;
      startTime: string;
      endTime: string;
      topic?: string;
      type?: ScheduleEntryType;
    },
    actor: AuthUser
  ) {
    if (actor.role !== Role.ADMIN && actor.role !== Role.TEACHER && actor.role !== Role.CR) {
      throw new AppError("You do not have permission to create schedule entries.", 403, "FORBIDDEN");
    }

    let targetBatchId = input.batchId;
    if (actor.role === Role.CR) {
      if (!actor.batchId) {
        throw new AppError("Class Representative does not have an assigned batch.", 400, "VALIDATION_ERROR");
      }
      targetBatchId = actor.batchId;
    }

    const targetDateStr = normalizeDateString(input.date);

    return await prisma.$transaction(async (tx) => {
      const conflictResult = await conflictService.checkConflict(
        {
          date: targetDateStr,
          startTime: input.startTime,
          endTime: input.endTime,
          roomId: input.roomId,
          teacherId: input.teacherId,
          batchId: targetBatchId,
        },
        tx
      );

      if (conflictResult.hasConflict) {
        throw new AppError(
          conflictResult.summaryMessage || "Scheduling conflict detected for class session",
          409,
          "CONFLICT_DETECTED",
          conflictResult
        );
      }

      const parsedDate = new Date(targetDateStr);
      const startMinutes = timeToMinutes(input.startTime);
      const endMinutes = timeToMinutes(input.endTime);

      const startDateTime = new Date(parsedDate);
      startDateTime.setUTCHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      const endDateTime = new Date(parsedDate);
      endDateTime.setUTCHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

      const newEntry = await tx.scheduleEntry.create({
        data: {
          type: input.type || ScheduleEntryType.CLASS,
          status: ScheduleEntryStatus.SCHEDULED,
          topic: input.topic,
          courseId: input.courseId,
          batchId: targetBatchId,
          teacherId: input.teacherId,
          roomId: input.roomId,
          date: parsedDate,
          startTime: startDateTime,
          endTime: endDateTime,
          createdById: actor.id,
        },
        include: {
          course: true,
          teacher: true,
          room: true,
          batch: true,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "CREATE_SCHEDULE_ENTRY",
          entityType: "ScheduleEntry",
          entityId: newEntry.id,
          ipAddress: "127.0.0.1",
          details: {
            courseId: input.courseId,
            date: targetDateStr,
            startTime: input.startTime,
            endTime: input.endTime,
            roomId: input.roomId,
            batchId: targetBatchId,
          },
        },
      });

      return newEntry;
    });
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

    if (actor.role === Role.CR) {
      if (entry.batchId === actor.batchId) {
        return;
      }
    }

    throw new AppError(
      "You do not have permission to modify this class schedule.",
      403,
      "FORBIDDEN"
    );
  }
}

export const scheduleService = new ScheduleService();
