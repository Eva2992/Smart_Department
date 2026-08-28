import type { Request, Response } from "express";
import { studentService } from "../services/student.service.js";
import { overrideStudentSemesterSchema, assignCRSchema } from "../validators/academic.validator.js";
import { sendSuccess } from "../utils/response.js";
import type { Program, StudentStatus, Role } from "@prisma/client";

export class StudentController {
  async searchStudents(req: Request, res: Response) {
    const { q, batchId, program, studentStatus, role, page, limit } = req.query;

    const result = await studentService.searchStudents({
      q: q ? String(q) : undefined,
      batchId: batchId ? String(batchId) : undefined,
      program: program ? (program as Program) : undefined,
      studentStatus: studentStatus ? (studentStatus as StudentStatus) : undefined,
      role: role ? (role as Role) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    return sendSuccess(res, result);
  }

  async overrideSemester(req: Request, res: Response) {
    const id = req.params.id as string;
    const validated = overrideStudentSemesterSchema.parse(req.body);
    const adminUser = req.user!;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    const updated = await studentService.overrideSemester(
      id,
      validated,
      adminUser.userId,
      ipAddress
    );
    return sendSuccess(res, updated, "Student status / semester updated successfully");
  }

  async assignCR(req: Request, res: Response) {
    const batchId = req.params.id as string;
    const validated = assignCRSchema.parse(req.body);
    const adminUser = req.user!;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    const updated = await studentService.assignCR(
      batchId,
      validated.studentId,
      adminUser.userId,
      ipAddress
    );

    return sendSuccess(res, updated, "Batch CR assigned successfully");
  }
}

export const studentController = new StudentController();
