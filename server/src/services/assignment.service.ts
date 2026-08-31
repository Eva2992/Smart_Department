import { AppError } from "../middleware/errorHandler.js";
import { prisma } from "../lib/prisma.js";

export interface CreateAssignmentInput {
  teacherId: string;
  courseId: string;
  batchId: string;
  title: string;
  description: string;
  dueDate: Date;
}

export interface UpdateAssignmentInput {
  assignmentId: string;
  teacherId: string;
  title?: string;
  description?: string;
  dueDate?: Date;
}

export interface AssignmentListItem {
  id: string;
  courseId: string;
  batchId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: Date;
  createdAt: Date;
  course: { id: string; code: string; name: string };
  teacher: { id: string; name: string };
  batch: { id: string; name: string };
  status: "UPCOMING" | "PAST_DUE";
}

function computeStatus(dueDate: Date): "UPCOMING" | "PAST_DUE" {
  return dueDate.getTime() < Date.now() ? "PAST_DUE" : "UPCOMING";
}

export async function createAssignment(input: CreateAssignmentInput) {
  const course = await prisma.course.findUnique({
    where: { id: input.courseId },
    include: {
      semester: {
        select: {
          batchId: true,
          batch: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!course) {
    throw new AppError("Course not found", 404, "COURSE_NOT_FOUND");
  }

  if (course.teacherId !== input.teacherId) {
    throw new AppError("You can only create assignments for your own course", 403, "FORBIDDEN");
  }

  if (course.semester.batchId !== input.batchId) {
    throw new AppError("Course does not belong to the selected batch", 409, "BATCH_MISMATCH");
  }

  if (input.dueDate.getTime() <= Date.now()) {
    throw new AppError("Assignment due date must be in the future", 400, "INVALID_DUE_DATE");
  }

  const assignment = await prisma.assignment.create({
    data: {
      teacherId: input.teacherId,
      courseId: input.courseId,
      batchId: input.batchId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      teacher: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });

  return {
    ...assignment,
    status: computeStatus(assignment.dueDate),
  };
}

export async function listAssignments(batchId: string): Promise<AssignmentListItem[]> {
  const assignments = await prisma.assignment.findMany({
    where: { batchId },
    include: {
      course: { select: { id: true, code: true, name: true } },
      teacher: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return assignments.map((assignment) => ({
    ...assignment,
    status: computeStatus(assignment.dueDate),
  }));
}

export async function updateAssignment(input: UpdateAssignmentInput) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
  }

  if (assignment.teacherId !== input.teacherId) {
    throw new AppError("You can only update your own assignments", 403, "FORBIDDEN");
  }

  if (input.dueDate && input.dueDate.getTime() <= Date.now()) {
    throw new AppError("Assignment due date must be in the future", 400, "INVALID_DUE_DATE");
  }

  const updated = await prisma.assignment.update({
    where: { id: input.assignmentId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
    },
    include: {
      course: { select: { id: true, code: true, name: true } },
      teacher: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true } },
    },
  });

  return {
    ...updated,
    status: computeStatus(updated.dueDate),
  };
}

export async function deleteAssignment(assignmentId: string, teacherId: string): Promise<void> {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
  }

  if (assignment.teacherId !== teacherId) {
    throw new AppError("You can only delete your own assignments", 403, "FORBIDDEN");
  }

  await prisma.assignment.delete({ where: { id: assignmentId } });
}
