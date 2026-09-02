import type { Request, Response } from "express";
import { preloadedService } from "../services/preloaded.service.js";
import { studentService } from "../services/student.service.js";
import { auditService } from "../services/audit.service.js";
import { sendSuccess } from "../utils/response.js";
import {
  bulkPreloadedStudentsSchema,
  bulkPreloadedTeachersSchema,
  updateUserRoleSchema,
} from "../validators/academic.validator.js";
import type { Program, Role } from "@prisma/client";

export class AdminController {
  /**
   * Bulk imports or updates preloaded students (AN-01).
   */
  async importPreloadedStudents(req: Request, res: Response) {
    // Supports both { students: [...] } or direct array [...]
    const rawData = Array.isArray(req.body) ? { students: req.body } : req.body;
    const validated = bulkPreloadedStudentsSchema.parse(rawData);
    const adminUser = req.user!;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    const result = await preloadedService.bulkCreateStudents(
      validated.students,
      adminUser.userId,
      ipAddress
    );

    return sendSuccess(
      res,
      result,
      `Successfully imported ${result.createdCount} preloaded student record(s)`
    );
  }

  /**
   * Lists preloaded students with optional batch filter.
   */
  async getPreloadedStudents(req: Request, res: Response) {
    const { batchId, program, search, page, limit } = req.query;

    const result = await preloadedService.getPreloadedStudents({
      batchId: batchId ? String(batchId) : undefined,
      program: program ? (program as Program) : undefined,
      search: search ? String(search) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    return sendSuccess(res, result);
  }

  /**
   * Bulk imports or updates preloaded teachers (AN-02).
   */
  async importPreloadedTeachers(req: Request, res: Response) {
    const rawData = Array.isArray(req.body) ? { teachers: req.body } : req.body;
    const validated = bulkPreloadedTeachersSchema.parse(rawData);
    const adminUser = req.user!;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    const result = await preloadedService.bulkCreateTeachers(
      validated.teachers,
      adminUser.userId,
      ipAddress
    );

    return sendSuccess(
      res,
      result,
      `Successfully imported ${result.createdCount} preloaded teacher record(s)`
    );
  }

  /**
   * Lists preloaded teachers.
   */
  async getPreloadedTeachers(req: Request, res: Response) {
    const { search, page, limit } = req.query;

    const result = await preloadedService.getPreloadedTeachers({
      search: search ? String(search) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    return sendSuccess(res, result);
  }

  /**
   * Changes user role between STUDENT and CR (AN-10, C-05).
   */
  async updateUserRole(req: Request, res: Response) {
    const id = req.params.id as string;
    const validated = updateUserRoleSchema.parse(req.body);
    const adminUser = req.user!;
    const ipAddress = req.ip || req.socket.remoteAddress || "127.0.0.1";

    const result = await studentService.updateUserRole(
      id,
      validated.role as Role,
      adminUser.userId,
      ipAddress
    );

    return sendSuccess(res, result, `User role successfully updated to ${validated.role}`);
  }

  /**
   * Fetches audit logs for admin review (NFR-12).
   */
  async getAuditLogs(req: Request, res: Response) {
    const { action, userId, entityType, startDate, endDate, page, limit } = req.query;

    const result = await auditService.getAuditLogs({
      action: action ? String(action) : undefined,
      userId: userId ? String(userId) : undefined,
      entityType: entityType ? String(entityType) : undefined,
      startDate: startDate ? new Date(String(startDate)) : undefined,
      endDate: endDate ? new Date(String(endDate)) : undefined,
      page: page ? parseInt(String(page), 10) : 1,
      limit: limit ? parseInt(String(limit), 10) : 20,
    });

    return sendSuccess(res, result);
  }
}

export const adminController = new AdminController();
