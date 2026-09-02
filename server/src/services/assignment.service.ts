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

export interface SubmitAssignmentInput {
  assignmentId: string;
  studentId: string;
  submissionType?: "URL" | "FILE" | "BOTH";
  submissionUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileSizeBytes?: number;
  notes?: string;
}

/**
 * Submits an assignment via external link, direct file, or both (FR-21, ADR-0005).
 */
export async function submitAssignment(input: SubmitAssignmentInput) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: input.assignmentId },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
  }

  const student = await prisma.user.findUnique({
    where: { id: input.studentId },
  });

  if (!student) {
    throw new AppError("Student not found", 404, "STUDENT_NOT_FOUND");
  }

  if (student.batchId !== assignment.batchId) {
    throw new AppError(
      "You do not belong to the batch assigned to this task",
      403,
      "BATCH_MISMATCH"
    );
  }

  if (!input.submissionUrl && !input.fileUrl) {
    throw new AppError(
      "Submission must contain an external URL or an attached file",
      400,
      "INVALID_SUBMISSION"
    );
  }

  let submissionType = input.submissionType;
  if (!submissionType) {
    if (input.submissionUrl && input.fileUrl) submissionType = "BOTH";
    else if (input.submissionUrl) submissionType = "URL";
    else submissionType = "FILE";
  }

  const submission = await prisma.assignmentSubmission.upsert({
    where: {
      assignmentId_studentId: {
        assignmentId: input.assignmentId,
        studentId: input.studentId,
      },
    },
    create: {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      submissionType,
      submissionUrl: input.submissionUrl || null,
      fileUrl: input.fileUrl || null,
      fileName: input.fileName || null,
      fileSizeBytes: input.fileSizeBytes || null,
      notes: input.notes || null,
    },
    update: {
      submissionType,
      submissionUrl: input.submissionUrl || null,
      fileUrl: input.fileUrl || null,
      fileName: input.fileName || null,
      fileSizeBytes: input.fileSizeBytes || null,
      notes: input.notes || null,
    },
  });

  return submission;
}

/**
 * Retrieves submissions for an assignment. Teachers/admins see all; students see their own.
 */
export async function getAssignmentSubmissions(
  assignmentId: string,
  user: { id: string; role: string }
) {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment) {
    throw new AppError("Assignment not found", 404, "ASSIGNMENT_NOT_FOUND");
  }

  if (user.role === "STUDENT") {
    const mySub = await prisma.assignmentSubmission.findUnique({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: user.id,
        },
      },
    });
    return mySub ? [mySub] : [];
  }

  // Teachers/Admins/CRs view all submissions
  const submissions = await prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          universityId: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  return submissions;
}
