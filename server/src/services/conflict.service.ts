import { Prisma, ScheduleEntryStatus, type ScheduleEntryType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export interface ScheduleConflictInput {
  roomId: string;
  teacherId: string;
  batchId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  excludeScheduleEntryId?: string;
}

export interface ConflictMatch {
  id: string;
  type: ScheduleEntryType;
  roomId: string;
  teacherId: string;
  batchId: string;
  roomNumber: string;
  teacherName: string;
  batchName: string;
  courseCode: string | null;
  courseName: string | null;
  date: Date;
  startTime: Date;
  endTime: Date;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: {
    room?: ConflictMatch;
    teacher?: ConflictMatch;
    batch?: ConflictMatch;
  };
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

function mapConflict(entry: {
  id: string;
  type: ScheduleEntryType;
  roomId: string;
  teacherId: string;
  batchId: string;
  room: { roomNumber: string };
  teacher: { name: string };
  batch: { name: string };
  course: { code: string; name: string } | null;
  date: Date;
  startTime: Date;
  endTime: Date;
}): ConflictMatch {
  return {
    id: entry.id,
    type: entry.type,
    roomId: entry.roomId,
    teacherId: entry.teacherId,
    batchId: entry.batchId,
    roomNumber: entry.room.roomNumber,
    teacherName: entry.teacher.name,
    batchName: entry.batch.name,
    courseCode: entry.course?.code ?? null,
    courseName: entry.course?.name ?? null,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
  };
}

export async function checkScheduleConflict(input: ScheduleConflictInput): Promise<ConflictResult> {
  const where: Prisma.ScheduleEntryWhereInput = {
    date: input.date,
    status: {
      notIn: [ScheduleEntryStatus.CANCELLED, ScheduleEntryStatus.HOLIDAY],
    },
    ...(input.excludeScheduleEntryId ? { id: { not: input.excludeScheduleEntryId } } : {}),
    OR: [{ roomId: input.roomId }, { teacherId: input.teacherId }, { batchId: input.batchId }],
  };

  const entries = await prisma.scheduleEntry.findMany({
    where,
    include: {
      room: true,
      teacher: { select: { name: true } },
      batch: { select: { name: true } },
      course: { select: { code: true, name: true } },
    },
  });

  const overlapping = entries.filter((entry) =>
    overlaps(input.startTime, input.endTime, entry.startTime, entry.endTime)
  );

  const roomConflict = overlapping.find((entry) => entry.roomId === input.roomId);
  const teacherConflict = overlapping.find((entry) => entry.teacherId === input.teacherId);
  const batchConflict = overlapping.find((entry) => entry.batchId === input.batchId);

  return {
    hasConflict: Boolean(roomConflict || teacherConflict || batchConflict),
    conflicts: {
      ...(roomConflict ? { room: mapConflict(roomConflict) } : {}),
      ...(teacherConflict ? { teacher: mapConflict(teacherConflict) } : {}),
      ...(batchConflict ? { batch: mapConflict(batchConflict) } : {}),
    },
  };
}
