import type { Request, Response } from "express";
import { resultService } from "../services/result.service.js";
import {
  uploadResultSchema,
  queryResultSchema,
  studentParamSchema,
} from "../validators/result.validator.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

export class ResultController {
  /**
   * Uploads and publishes semester final results (Dual-hybrid storage).
   * Authorized for CR of the batch or Admin.
   */
  async uploadResults(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required to upload results", 401, "UNAUTHORIZED");
    }

    const validatedData = uploadResultSchema.parse(req.body);

    const result = await resultService.publishResult(validatedData, {
      id: req.user.userId,
      role: req.user.role,
      batchId: req.user.batchId,
    });

    sendCreated(
      res,
      result,
      `Successfully published results for ${result.publishedCount} students in ${result.batchName} (${result.semesterName})`
    );
  }

  /**
   * Public & authenticated search and query of published results.
   */
  async queryResults(req: Request, res: Response): Promise<void> {
    const validatedQuery = queryResultSchema.parse(req.query);
    const data = await resultService.queryResults(validatedQuery);

    sendSuccess(res, data, "Results retrieved successfully");
  }

  /**
   * Fetches results for a specific student by University ID or User ID.
   */
  async getStudentResults(req: Request, res: Response): Promise<void> {
    const { id } = studentParamSchema.parse(req.params);
    const results = await resultService.getStudentResults(id);

    sendSuccess(res, results, `Results for student '${id}' retrieved successfully`);
  }

  /**
   * Returns current authenticated student's full result history.
   */
  async getMyResults(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const identifier = req.user.universityId || req.user.userId;
    const results = await resultService.getStudentResults(identifier);

    sendSuccess(res, results, "Personal results retrieved successfully");
  }

  /**
   * Fetches batch and semester analytics and summary.
   */
  async getBatchSemesterSummary(req: Request, res: Response): Promise<void> {
    const batchId =
      typeof req.params.batchId === "string" ? req.params.batchId : req.params.batchId?.[0];
    const semesterId =
      typeof req.params.semesterId === "string"
        ? req.params.semesterId
        : req.params.semesterId?.[0];

    if (!batchId || !semesterId) {
      throw new AppError("batchId and semesterId are required", 400, "INVALID_PARAMS");
    }

    const summary = await resultService.getBatchSemesterSummary(batchId, semesterId);
    if (!summary) {
      throw new AppError("No results found for the specified batch and semester", 404, "NOT_FOUND");
    }

    sendSuccess(res, summary, "Batch semester summary retrieved successfully");
  }
}

export const resultController = new ResultController();
