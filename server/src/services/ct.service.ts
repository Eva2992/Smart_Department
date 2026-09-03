import { ScheduleEntryStatus, ScheduleEntryType } from "@prisma/client";
import { AppError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";
import { checkScheduleConflict } from "./conflict.service.js";
import { notificationService, NotificationType } from "./notification.service.js";

export interface ScheduleCTInput {
  scheduleEntryId: string;
  teacherId: string;
  topic: string;
  confirmSameDayConflict?: boolean;
}

export interface UpdateCTInput {
  ctId: string;
  teacherId: string;
  topic?: string;
  date?: Date;
  startTime?: Date;
  endTime?: Date;
  roomNumber?: string;
  confirmSameDayConflict?: boolean;
}

export interface CancelCTInput {
  ctId: string;
  teacherId: string;
}

export interface StudentCTMarkItem {
  scheduleEntryId: string;
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
  ctTitle: string;
  topic: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
  roomNumber: string;
  teacherName: string;
  marksObtained: number | null;
  maxMarks: number | null;
  status: "PENDING" | "RECORDED";
}

export interface StudentCTMarksGroup {
  courseId: string | null;
  courseCode: string | null;
  courseName: string | null;
  marks: StudentCTMarkItem[];
}

export interface StudentCTMarksResponse {
  student: {
    id: string;
    name: string;
    universityId: string | null;
    batchId: string | null;
    batchName: string | null;
    semesterId: string | null;
    semesterName: string | null;
  };
  groups: StudentCTMarksGroup[];
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

async function resolveRoom(roomNumber?: string) {
  if (!roomNumber) return null;

  const room = await prisma.room.findUnique({
    where: { roomNumber },
    select: { id: true, roomNumber: true },
  });

  if (!room) {
    throw new AppError(`Room ${roomNumber} not found`, 404, "ROOM_NOT_FOUND");
  }

  return room;
}

function ensureDateRange(startTime: Date, endTime: Date): void {
  if (startTime >= endTime) {
    throw new AppError("CT end time must be after the start time", 400, "INVALID_TIME_RANGE");
  }
}

function groupMarks(items: StudentCTMarkItem[]): StudentCTMarksGroup[] {
  const groups = new Map<string, StudentCTMarksGroup>();

  for (const item of items) {
    const groupKey = item.courseId ?? "__no_course__";
    const existing = groups.get(groupKey);

    if (existing) {
      existing.marks.push(item);
      continue;
    }

    groups.set(groupKey, {
      courseId: item.courseId,
      courseCode: item.courseCode,
      courseName: item.courseName,
      marks: [item],
    });
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    marks: group.marks.sort((left, right) => left.date.getTime() - right.date.getTime()),
  }));
}

export async function scheduleCT(input: ScheduleCTInput) {
  const entry = await prisma.scheduleEntry.findUnique({
    where: { id: input.scheduleEntryId },
    include: {
      course: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
    },
  });

  if (!entry) {
    throw new AppError("Schedule entry not found", 404, "SCHEDULE_ENTRY_NOT_FOUND");
  }

  if (entry.type !== ScheduleEntryType.CLASS) {
    throw new AppError(
      "Only regular class slots can be converted to CT sessions",
      409,
      "INVALID_CT_SOURCE"
    );
  }

  if (entry.teacherId !== input.teacherId) {
    throw new AppError(
      "You can only convert your own class slots to CT sessions",
      403,
      "FORBIDDEN"
    );
  }

  if (entry.status !== ScheduleEntryStatus.SCHEDULED) {
    throw new AppError(
      "Only scheduled class slots can be converted to CT sessions",
      409,
      "INVALID_CLASS_STATUS"
    );
  }

  ensureDateRange(entry.startTime, entry.endTime);

  const conflict = await checkScheduleConflict({
    roomId: entry.roomId,
    teacherId: entry.teacherId,
    batchId: entry.batchId,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    excludeScheduleEntryId: entry.id,
  });

  if (conflict.hasConflict) {
    throw new AppError("Schedule conflict detected", 409, "SCHEDULE_CONFLICT", conflict.conflicts);
  }

  const sameDayCTs = await prisma.scheduleEntry.findMany({
    where: {
      batchId: entry.batchId,
      date: entry.date,
      type: ScheduleEntryType.CT,
      status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
      id: { not: entry.id },
    },
    include: {
      course: { select: { code: true, name: true } },
      room: { select: { roomNumber: true } },
    },
  });

  if (sameDayCTs.length > 0 && !input.confirmSameDayConflict) {
    throw new AppError(
      "Another CT already exists on this date for the same batch. Confirm again to proceed.",
      409,
      "CT_SAME_DAY_WARNING",
      sameDayCTs.map((ct) => ({
        id: ct.id,
        courseCode: ct.course?.code ?? null,
        courseName: ct.course?.name ?? null,
        roomNumber: ct.room.roomNumber,
        date: ct.date,
        startTime: ct.startTime,
        endTime: ct.endTime,
      }))
    );
  }

  const ctEntry = await prisma.scheduleEntry.update({
    where: { id: entry.id },
    data: { type: ScheduleEntryType.CT, topic: input.topic },
    include: {
      course: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
    },
  });

  // FR-31: Notify batch students about new CT
  const dateStr = new Date(entry.date).toISOString().split("T")[0];
  await notificationService.createBulkForBatch(
    entry.batchId,
    NotificationType.CT_SCHEDULED,
    `New CT scheduled for ${entry.course?.name || "course"} on ${dateStr} — Topic: ${input.topic}`,
    "ScheduleEntry",
    entry.id
  );

  return {
    ctEntry,
    warnings:
      sameDayCTs.length > 0 ? ["Another CT already exists on this date for the same batch."] : [],
  };
}

export async function updateCT(input: UpdateCTInput) {
  const entry = await prisma.scheduleEntry.findUnique({
    where: { id: input.ctId },
    include: {
      course: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
    },
  });

  if (!entry) {
    throw new AppError("CT entry not found", 404, "CT_NOT_FOUND");
  }

  if (entry.type !== ScheduleEntryType.CT) {
    throw new AppError("Only CT entries can be updated here", 409, "INVALID_CT_SOURCE");
  }

  if (entry.teacherId !== input.teacherId) {
    throw new AppError("You can only update your own CT sessions", 403, "FORBIDDEN");
  }

  const resolvedRoom = await resolveRoom(input.roomNumber);
  const targetRoomId = resolvedRoom?.id ?? entry.roomId;
  const targetDate = input.date ?? entry.date;
  const targetStartTime = input.startTime ?? entry.startTime;
  const targetEndTime = input.endTime ?? entry.endTime;
  const targetTopic = input.topic ?? entry.topic;

  if (targetDate < startOfToday()) {
    throw new AppError("CT cannot be moved to a past date", 400, "INVALID_CT_DATE");
  }

  ensureDateRange(targetStartTime, targetEndTime);

  const conflict = await checkScheduleConflict({
    roomId: targetRoomId,
    teacherId: entry.teacherId,
    batchId: entry.batchId,
    date: targetDate,
    startTime: targetStartTime,
    endTime: targetEndTime,
    excludeScheduleEntryId: entry.id,
  });

  if (conflict.hasConflict) {
    throw new AppError("Schedule conflict detected", 409, "SCHEDULE_CONFLICT", conflict.conflicts);
  }

  const sameDayCTs = await prisma.scheduleEntry.findMany({
    where: {
      batchId: entry.batchId,
      date: targetDate,
      type: ScheduleEntryType.CT,
      status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
      id: { not: entry.id },
    },
    include: {
      course: { select: { code: true, name: true } },
      room: { select: { roomNumber: true } },
    },
  });

  if (sameDayCTs.length > 0 && !input.confirmSameDayConflict) {
    throw new AppError(
      "Another CT already exists on this date for the same batch. Confirm again to proceed.",
      409,
      "CT_SAME_DAY_WARNING",
      sameDayCTs.map((ct) => ({
        id: ct.id,
        courseCode: ct.course?.code ?? null,
        courseName: ct.course?.name ?? null,
        roomNumber: ct.room.roomNumber,
        date: ct.date,
        startTime: ct.startTime,
        endTime: ct.endTime,
      }))
    );
  }

  const ctEntry = await prisma.scheduleEntry.update({
    where: { id: entry.id },
    data: {
      date: targetDate,
      startTime: targetStartTime,
      endTime: targetEndTime,
      roomId: targetRoomId,
      topic: targetTopic,
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
    },
  });

  return {
    ctEntry,
    warnings:
      sameDayCTs.length > 0 ? ["Another CT already exists on this date for the same batch."] : [],
  };
}

export async function cancelCT(input: CancelCTInput) {
  // No past-date guard here intentionally: a teacher should always be able to
  // undo a CT conversion even after the date has passed (e.g. data-entry mistakes).
  // updateCT prevents moving a CT to a past date, which is a separate concern.
  const entry = await prisma.scheduleEntry.findUnique({
    where: { id: input.ctId },
    include: {
      course: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
    },
  });

  if (!entry) {
    throw new AppError("CT entry not found", 404, "CT_NOT_FOUND");
  }

  if (entry.type !== ScheduleEntryType.CT) {
    throw new AppError("Only CT entries can be cancelled here", 409, "INVALID_CT_SOURCE");
  }

  if (entry.teacherId !== input.teacherId) {
    throw new AppError("You can only cancel your own CT sessions", 403, "FORBIDDEN");
  }

  const cancelledEntry = await prisma.scheduleEntry.update({
    where: { id: entry.id },
    data: {
      type: ScheduleEntryType.CLASS,
      status: ScheduleEntryStatus.SCHEDULED,
      topic: null,
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      batch: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      room: { select: { id: true, roomNumber: true } },
    },
  });

  return {
    ctEntry: cancelledEntry,
    message: "CT cancelled and restored back to regular class",
  };
}

export async function listStudentCTMarks(studentId: string): Promise<StudentCTMarksResponse> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          currentSemester: {
            select: { id: true, name: true, startDate: true, endDate: true },
          },
        },
      },
    },
  });

  if (!student) {
    throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
  }

  if (!student.batchId || !student.batch?.currentSemester) {
    return {
      student: {
        id: student.id,
        name: student.name,
        universityId: student.universityId,
        batchId: student.batchId,
        batchName: student.batch?.name ?? null,
        semesterId: student.batch?.currentSemester?.id ?? null,
        semesterName: student.batch?.currentSemester?.name ?? null,
      },
      groups: [],
    };
  }

  const ctEntries = await prisma.scheduleEntry.findMany({
    where: {
      batchId: student.batchId,
      type: ScheduleEntryType.CT,
      status: { notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY] },
      date: {
        gte: student.batch.currentSemester.startDate,
        lte: student.batch.currentSemester.endDate,
      },
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      teacher: { select: { name: true } },
      room: { select: { roomNumber: true } },
      ctMarks: {
        where: { studentId },
        select: { marksObtained: true, maxMarks: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const items: StudentCTMarkItem[] = ctEntries.map((entry) => {
    const mark = entry.ctMarks[0];

    return {
      scheduleEntryId: entry.id,
      courseId: entry.courseId,
      courseCode: entry.course?.code ?? null,
      courseName: entry.course?.name ?? null,
      ctTitle: entry.topic ?? "CT",
      topic: entry.topic,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      roomNumber: entry.room.roomNumber,
      teacherName: entry.teacher.name,
      marksObtained: mark?.marksObtained ?? null,
      maxMarks: mark?.maxMarks ?? null,
      status: mark ? "RECORDED" : "PENDING",
    };
  });

  return {
    student: {
      id: student.id,
      name: student.name,
      universityId: student.universityId,
      batchId: student.batchId,
      batchName: student.batch.name,
      semesterId: student.batch.currentSemester.id,
      semesterName: student.batch.currentSemester.name,
    },
    groups: groupMarks(items),
  };
}
