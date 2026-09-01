/**
 * Exam Controller — thin HTTP adapter for examService.
 * FR-22: Semester Final Exam Routine Generation
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

export class ExamController {
  /**
   * POST /api/v1/exams/routine
   * Admin creates / bulk-upserts the semester final exam routine.
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
   * GET /api/v1/exams/routine
   * Retrieves the exam routine (Student, Teacher, Admin — all authenticated).
   */
  async getExamSchedule(req: Request, res: Response): Promise<void> {
    const filter = examQuerySchema.parse(req.query);
    const data = await examService.getExamSchedule(filter);

    sendSuccess(res, data, "Exam schedule retrieved successfully");
  }

  /**
   * GET /api/v1/exams/routine/:id
   * Retrieves a single exam entry by ID.
   */
  async getExamEntryById(req: Request, res: Response): Promise<void> {
    const { id } = examIdParamSchema.parse(req.params);
    const exam = await examService.getExamEntryById(id);

    sendSuccess(res, exam, "Exam entry retrieved successfully");
  }

  /**
   * PATCH /api/v1/exams/routine/:id
   * Admin modifies an existing exam entry (with conflict re-check).
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
   * DELETE /api/v1/exams/routine/:id
   * Admin cancels an exam entry (sets status to CANCELLED).
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
