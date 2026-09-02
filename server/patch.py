import re

# File paths
schedule_service_path = "/home/nirob202/Projects/Smart_Department/server/src/services/scheduleService.ts"
conflict_service_path = "/home/nirob202/Projects/Smart_Department/server/src/services/conflictService.ts"
room_controller_path = "/home/nirob202/Projects/Smart_Department/server/src/controllers/room.controller.ts"
schedule_controller_path = "/home/nirob202/Projects/Smart_Department/server/src/controllers/schedule.controller.ts"
room_routes_path = "/home/nirob202/Projects/Smart_Department/server/src/routes/room.routes.ts"
schedule_routes_path = "/home/nirob202/Projects/Smart_Department/server/src/routes/schedule.routes.ts"
rbac_path = "/home/nirob202/Projects/Smart_Department/server/src/middleware/rbac.ts"

# 1. scheduleService.ts
with open(schedule_service_path, "r") as f:
    content = f.read()

# Add interfaces
interfaces = """export interface GenerateRoutineInput {
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
}"""
content = content.replace("export interface GenerateRoutineInput {\n  batchId: string;\n  semesterId: string;\n  startDate: string | Date;\n  endDate: string | Date;\n  template: GenerateRoutineTemplateItem[];\n}", interfaces)

# Add getSchedule docs
content = content.replace("  /**\n   * Fetch schedule entries with filters.\n   */\n  async getSchedule(", """  /**
   * Fetch schedule entries with filters.
   *
   * @param filters - Optional filters for the schedule entries
   * @returns An array of schedule entries matching the filters
   *
   * @example
   * ```ts
   * const schedule = await scheduleService.getSchedule({ roomId: 'room-uuid' });
   * ```
   */
  async getSchedule(""")

# Add getMySchedule docs
content = content.replace("  /**\n   * Fetch personalized schedule entries for current actor.\n   */\n  async getMySchedule(", """  /**
   * Fetch personalized schedule entries for current actor.
   *
   * @param actor - The authenticated user requesting their schedule
   * @param filters - Optional filters
   * @returns An array of personalized schedule entries
   * @throws {AppError} 400 if a student is not assigned to a batch
   *
   * @example
   * ```ts
   * const mySchedule = await scheduleService.getMySchedule(user);
   * ```
   */
  async getMySchedule(""")

# Add getScheduleById docs
content = content.replace("  /**\n   * Get single schedule entry by ID with validation.\n   */\n  async getScheduleById(", """  /**
   * Get single schedule entry by ID with validation.
   *
   * @param id - The unique ID of the schedule entry
   * @returns The schedule entry with relations included
   * @throws {AppError} 404 if the schedule entry is not found
   *
   * @example
   * ```ts
   * const entry = await scheduleService.getScheduleById('entry-uuid');
   * ```
   */
  async getScheduleById(""")

# Add rescheduleClass docs
content = content.replace("  /**\n   * Reschedule a class to a new date, time, and/or room with 3-way transactional conflict checking (FR-17).\n   */\n  async rescheduleClass(", """  /**
   * Reschedule a class to a new date, time, and/or room with 3-way transactional conflict checking (FR-17).
   *
   * @param id - The schedule entry ID
   * @param payload - The new date, time, and optional room details
   * @param actor - The user performing the reschedule
   * @returns The updated schedule entry
   * @throws {AppError} 400 if class is cancelled or on a holiday
   * @throws {AppError} 403 if actor doesn't have permission
   * @throws {AppError} 409 if a scheduling conflict is detected
   *
   * @example
   * ```ts
   * const updated = await scheduleService.rescheduleClass('id', { date: '2026-10-01', startTime: '10:00', endTime: '11:30' }, user);
   * ```
   */
  async rescheduleClass(""")

# Add updateClassTime docs
content = content.replace("  /**\n   * Change time of scheduled class on the same day (FR-16).\n   */\n  async updateClassTime(", """  /**
   * Change time of scheduled class on the same day (FR-16).
   *
   * @param id - The schedule entry ID
   * @param payload - The new start and end time
   * @param actor - The user performing the update
   * @returns The updated schedule entry
   *
   * @example
   * ```ts
   * const updated = await scheduleService.updateClassTime('id', { startTime: '13:30', endTime: '15:00' }, user);
   * ```
   */
  async updateClassTime(""")

# Add cancelClass docs
content = content.replace("  /**\n   * Cancel a scheduled class instance (FR-15).\n   */\n  async cancelClass(", """  /**
   * Cancel a scheduled class instance (FR-15).
   *
   * @param id - The schedule entry ID
   * @param payload - Optional cancellation reason
   * @param actor - The user cancelling the class
   * @returns The updated schedule entry marked as cancelled
   * @throws {AppError} 400 if class is already cancelled
   * @throws {AppError} 403 if actor lacks permission
   *
   * @example
   * ```ts
   * const cancelled = await scheduleService.cancelClass('id', { reason: 'Teacher unavailable' }, user);
   * ```
   */
  async cancelClass(""")

# Add getRoomAvailability docs
content = content.replace("  /**\n   * Room availability matrix for all 8 fixed rooms on a given date (FR-13).\n   */\n  async getRoomAvailability(", """  /**
   * Room availability matrix for all 8 fixed rooms on a given date (FR-13).
   *
   * @param date - The date to check availability for
   * @param roomId - Optional specific room ID
   * @returns A matrix of rooms and their slot availability
   *
   * @example
   * ```ts
   * const matrix = await scheduleService.getRoomAvailability('2026-09-01');
   * ```
   */
  async getRoomAvailability(""")

# Add generateRoutine docs
content = content.replace("  /**\n   * Day-Wise Routine Generation across semester date range (FR-10).\n   */\n  async generateRoutine(", """  /**
   * Day-Wise Routine Generation across semester date range (FR-10).
   *
   * @param input - The routine template and date range
   * @param actor - The admin generating the routine
   * @returns The generation result including the number of created entries
   * @throws {AppError} 400 if start date is after end date
   * @throws {AppError} 403 if actor is not an admin
   *
   * @example
   * ```ts
   * const result = await scheduleService.generateRoutine(input, adminUser);
   * ```
   */
  async generateRoutine(""")

# Slice 1: Add getAllRoomsSchedule
getAllRoomsSchedule_method = """
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
   * Day-Wise Routine Generation across semester date range (FR-10)."""

content = content.replace("  /**\n   * Day-Wise Routine Generation across semester date range (FR-10).", getAllRoomsSchedule_method)


# Slice 2: createSeminarEntry
createSeminarEntry_method = """
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
    if (actor.role !== Role.ADMIN && !actor.isChairman) {
      throw new AppError("Only the Chairman or Admin can create seminars", 403, "FORBIDDEN");
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
          batchId: input.batchId,
        },
        tx
      );

      if (conflictResult.hasConflict) {
        throw new AppError(
          conflictResult.summaryMessage || "Scheduling conflict detected for seminar",
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
          courseId: input.courseId || null,
          batchId: input.batchId,
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
   * Helper to verify ownership or admin privilege.
   */"""
content = content.replace("  /**\n   * Helper to verify ownership or admin privilege.\n   */", createSeminarEntry_method)

with open(schedule_service_path, "w") as f:
    f.write(content)


# 2. conflictService.ts
with open(conflict_service_path, "r") as f:
    content = f.read()

content = content.replace("/**\n * Pure in-memory conflict evaluation given a proposed slot and a list of existing schedule records.\n */\nexport function evaluateInMemConflicts(", """/**
 * Pure in-memory conflict evaluation given a proposed slot and a list of existing schedule records.
 *
 * @param existingEntries - Array of existing schedule entries to check against
 * @param input - The proposed time slot and resources to check
 * @returns A detailed ConflictResult object
 *
 * @example
 * ```ts
 * const result = evaluateInMemConflicts(entries, { date: '2026-09-01', startTime: '10:00', endTime: '11:30' });
 * ```
 */
export function evaluateInMemConflicts(""")

content = content.replace("  /**\n   * Checks database for any 3-way scheduling conflict (Room, Teacher, Batch).\n   */\n  async checkConflict(", """  /**
   * Checks database for any 3-way scheduling conflict (Room, Teacher, Batch).
   *
   * @param input - The scheduling parameters to check for conflicts
   * @param txClient - Optional Prisma transaction client
   * @returns Result indicating if a conflict exists and details about the conflict
   *
   * @example
   * ```ts
   * const result = await conflictService.checkConflict({ date: '2026-09-01', startTime: '10:00', endTime: '11:30', roomId: 'r1' });
   * ```
   */
  async checkConflict(""")

content = content.replace("  /**\n   * Helper to check pure interval overlap.\n   */\n  checkOverlap(", """  /**
   * Helper to check pure interval overlap.
   *
   * @param startA - Start time of first interval
   * @param endA - End time of first interval
   * @param startB - Start time of second interval
   * @param endB - End time of second interval
   * @returns true if intervals overlap, false otherwise
   *
   * @example
   * ```ts
   * const overlaps = conflictService.checkOverlap('10:00', '11:30', '11:00', '12:00'); // true
   * ```
   */
  checkOverlap(""")

with open(conflict_service_path, "w") as f:
    f.write(content)


# 3. room.controller.ts
with open(room_controller_path, "r") as f:
    content = f.read()

content = content.replace("  async getRoomAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Get availability matrix for rooms.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getRoomAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async getAllRooms(_req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Get all available rooms.
   *
   * @param _req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getAllRooms(_req: Request, res: Response, next: NextFunction): Promise<void> {""")

getScheduleGrid_method = """
  /**
   * Retrieves the multi-day room schedule grid for the Room Availability Matrix.
   *
   * @param req - Express request with query params `startDate` and `endDate` (YYYY-MM-DD)
   * @param res - Express response
   * @param next - Express next function for error propagation
   *
   * @example
   * GET /api/v1/rooms/schedule?startDate=2026-09-01&endDate=2026-09-04
   */
  async getScheduleGrid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate as string;
      let endDate = req.query.endDate as string;

      if (!startDate) {
        throw new Error("startDate is required");
      }

      if (!endDate) {
        const start = new Date(normalizeDateString(startDate));
        start.setDate(start.getDate() + 4);
        endDate = normalizeDateString(start);
      }

      const data = await scheduleService.getAllRoomsSchedule(startDate, endDate);
      sendSuccess(res, data, "Room schedule grid retrieved");
    } catch (err) {
      next(err);
    }
  }
}"""
content = content.replace("}\n\nexport const roomController", getScheduleGrid_method + "\n\nexport const roomController")

with open(room_controller_path, "w") as f:
    f.write(content)


# 4. schedule.controller.ts
with open(schedule_controller_path, "r") as f:
    content = f.read()

content = content.replace("const checkConflictSchema = z.object({", """const createSeminarSchema = z.object({
  title: z.string().min(1, "Seminar title is required"),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  roomId: z.string().min(1, "Room selection is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  batchId: z.string().min(1, "Batch is required"),
  courseId: z.string().optional(),
});

const checkConflictSchema = z.object({""")

content = content.replace("export class ScheduleController {\n  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {", """export class ScheduleController {
  /**
   * Retrieves the schedule.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Retrieves the current user's schedule.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getMySchedule(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async getScheduleById(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Retrieves a schedule entry by its ID.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async getScheduleById(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async checkConflict(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Checks for schedule conflicts.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async checkConflict(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async rescheduleClass(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Reschedules a class.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async rescheduleClass(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async updateClassTime(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Updates the time of a class.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async updateClassTime(req: Request, res: Response, next: NextFunction): Promise<void> {""")

content = content.replace("  async cancelClass(req: Request, res: Response, next: NextFunction): Promise<void> {", """  /**
   * Cancels a class.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async cancelClass(req: Request, res: Response, next: NextFunction): Promise<void> {""")

createSeminar_method = """
  /**
   * Creates a new seminar schedule entry.
   *
   * @param req - Express request object
   * @param res - Express response object
   * @param next - Express next function
   */
  async createSeminar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Authentication required", 401, "UNAUTHORIZED");
      }
      const body = createSeminarSchema.parse(req.body);
      const data = await scheduleService.createSeminarEntry(body, req.user);
      sendCreated(res, data, "Seminar scheduled successfully");
    } catch (err) {
      next(err);
    }
  }
}"""
content = content.replace("}\n\nexport const scheduleController", createSeminar_method + "\n\nexport const scheduleController")

with open(schedule_controller_path, "w") as f:
    f.write(content)


# 5. room.routes.ts
with open(room_routes_path, "r") as f:
    content = f.read()

content = content.replace("roomRouter.get(\"/\", optionalAuthenticate, (req, res, next) => {", """roomRouter.get("/schedule", optionalAuthenticate, (req, res, next) => {
  roomController.getScheduleGrid(req, res, next);
});

roomRouter.get("/", optionalAuthenticate, (req, res, next) => {""")

with open(room_routes_path, "w") as f:
    f.write(content)


# 6. schedule.routes.ts
with open(schedule_routes_path, "r") as f:
    content = f.read()

content = content.replace("import { authorize } from \"../middleware/rbac.js\";", "import { authorize, requireChairman } from \"../middleware/rbac.js\";")

content = content.replace("// Get schedule list (public or authenticated)", """scheduleRouter.post(
  "/seminar",
  authenticate,
  authorize(Role.TEACHER, Role.ADMIN),
  requireChairman,
  (req, res, next) => {
    scheduleController.createSeminar(req, res, next);
  }
);

// Get schedule list (public or authenticated)""")

with open(schedule_routes_path, "w") as f:
    f.write(content)


# 7. rbac.ts
with open(rbac_path, "r") as f:
    content = f.read()

content = content.replace("/**\n * Role-based access control middleware.\n */\nexport function authorize(", """/**
 * Role-based access control middleware.
 *
 * @param allowedRoles - The roles that are allowed to access the route
 * @returns Express middleware function
 *
 * @example
 * ```ts
 * router.get('/admin-only', authorize(Role.ADMIN), handler);
 * ```
 */
export function authorize(""")

content = content.replace("/**\n * Chairman role check middleware.\n */\nexport function requireChairman(", """/**
 * Chairman role check middleware.
 * Requires the user to have isChairman true or be an Admin.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next function
 *
 * @example
 * ```ts
 * router.post('/seminar', requireChairman, handler);
 * ```
 */
export function requireChairman(""")

with open(rbac_path, "w") as f:
    f.write(content)

print("Files patched successfully!")
