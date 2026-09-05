/**
 * Exam Controller — thin HTTP adapter for {@link examService}.
 *
 * Handles request deserialization, Zod validation, response formatting,
 * and authentication/authorization guard checks for semester final exam
 * routine endpoints.
 *
 * Implements FR-22: Semester Final Exam Routine Generation.
 *
 * @see {@link examService} for business logic.
 * @see {@link examRouter} for route definitions.
 * @module controllers/exam
 */

import type { Request, Response } from "express";
import { examService } from "../services/examService.js";
import {
  bulkCreateExamSchema,
  updateExamEntrySchema,
  examQuerySchema,
  examIdParamSchema,
} from "../validators/exam.validator.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Express controller class for semester final exam routine operations.
 *
 * All methods are thin HTTP adapters that validate input via Zod schemas,
 * delegate to {@link examService}, and format standardized JSON responses.
 */
export class ExamController {
  /**
   * Creates the semester final exam routine entries in bulk.
   *
   * Validates the request body against {@link bulkCreateExamSchema}, then delegates
   * to {@link examService.createExamRoutine} for transactional creation with
   * per-entry 3-way conflict detection.
   *
   * Admin-only endpoint.
   *
   * @param req - Express request with authenticated admin user and bulk exam payload body.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   *
   * @example
   * ```
   * POST /api/v1/exams/routine
   * Authorization: Bearer <admin-token>
   * Body: { entries: [{ batchId, courseName, roomId, date, startTime, endTime }] }
   * ```
   */
  async createExamRoutine(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const input = bulkCreateExamSchema.parse(req.body);
    const exams = await examService.createExamRoutine(input, req.user.userId);

    sendCreated(res, exams, `${exams.length} exam entr${exams.length === 1 ? "y" : "ies"} created successfully`);
  }

  /**
   * Retrieves the exam routine with optional filtering and pagination.
   *
   * Validates query parameters against {@link examQuerySchema} and delegates
   * to {@link examService.getExamSchedule}. Available to all authenticated users
   * (Student, Teacher, Admin).
   *
   * @param req - Express request with query parameters.
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/exams/routine?batchId=xxx&startDate=2026-12-01&page=1&limit=50
   * Authorization: Bearer <token>
   * ```
   */
  async getExamSchedule(req: Request, res: Response): Promise<void> {
    const filter = examQuerySchema.parse(req.query);
    const data = await examService.getExamSchedule(filter);

    sendSuccess(res, data, "Exam schedule retrieved successfully");
  }

  /**
   * Retrieves a single exam entry by its UUID.
   *
   * Validates the `id` path parameter and delegates to
   * {@link examService.getExamEntryById}.
   *
   * @param req - Express request with `id` path parameter.
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/exams/routine/entry-uuid
   * Authorization: Bearer <token>
   * ```
   */
  async getExamEntryById(req: Request, res: Response): Promise<void> {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await examService.getExamEntryById(id);

    sendSuccess(res, exam, "Exam entry retrieved successfully");
  }

  /**
   * Modifies an existing exam entry with conflict re-check.
   *
   * Validates the `id` path parameter and request body against
   * {@link updateExamEntrySchema}, then delegates to {@link examService.updateExamEntry}
   * which re-runs 3-way conflict detection with Self-Exclusion.
   *
   * Admin-only endpoint.
   *
   * @param req - Express request with authenticated admin user, `id` path parameter, and update body.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   *
   * @example
   * ```
   * PATCH /api/v1/exams/routine/entry-uuid
   * Authorization: Bearer <admin-token>
   * Body: { roomId: "new-room-uuid", startTime: "10:00" }
   * ```
   */
  async updateExamEntry(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const { id } = examIdParamSchema.parse(req.params);
    const updates = updateExamEntrySchema.parse(req.body);
    const exam = await examService.updateExamEntry(id, updates);

    sendSuccess(res, exam, "Exam entry updated successfully");
  }

  /**
   * Cancels an exam entry by setting its status to `CANCELLED` (soft-delete).
   *
   * Validates the `id` path parameter and delegates to
   * {@link examService.cancelExamEntry}.
   *
   * Admin-only endpoint.
   *
   * @param req - Express request with authenticated admin user and `id` path parameter.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   *
   * @example
   * ```
   * DELETE /api/v1/exams/routine/entry-uuid
   * Authorization: Bearer <admin-token>
   * ```
   */
  async cancelExamEntry(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const { id } = examIdParamSchema.parse(req.params);
    const exam = await examService.cancelExamEntry(id);

    sendSuccess(res, exam, "Exam entry cancelled successfully");
  }
}

export const examController = new ExamController();
