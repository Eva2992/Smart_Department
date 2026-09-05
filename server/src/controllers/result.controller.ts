/**
 * Result Controller — thin HTTP adapter for {@link ResultService}.
 *
 * Handles request deserialization, Zod validation, response formatting,
 * and RBAC guard checks for semester final result endpoints.
 *
 * Implements:
 * - **FR-25**: Result Upload by Class Representative (CR).
 * - **FR-26**: Public Result Page for querying and viewing results.
 *
 * @see {@link ResultService} for business logic.
 * @see {@link resultRouter} for route definitions.
 * @module controllers/result
 */

import type { Request, Response } from "express";
import { resultService } from "../services/result.service.js";
import {
  uploadResultSchema,
  queryResultSchema,
  studentParamSchema,
} from "../validators/result.validator.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Express controller class for semester final result operations.
 *
 * All methods are thin HTTP adapters that validate input via Zod schemas,
 * delegate to {@link ResultService}, and format standardized JSON responses.
 */
export class ResultController {
  /**
   * Uploads and publishes semester final results with dual-hybrid storage (ADR-0004).
   *
   * Validates the request body against {@link uploadResultSchema}, then delegates
   * to {@link ResultService.publishResult} for RBAC enforcement, student record
   * resolution, relational result upsert, and resource archival.
   *
   * Authorized for CR of the batch or Admin only.
   *
   * @param req - Express request with authenticated user and result payload body.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   *
   * @example
   * ```
   * POST /api/v1/results/upload
   * Authorization: Bearer <token>
   * Body: { batchId, semesterId, results: [...], rawContent?: "..." }
   * ```
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
   * Public and authenticated search/query of published results.
   *
   * Validates query parameters against {@link queryResultSchema} and delegates
   * to {@link ResultService.queryResults} for paginated, multi-facet filtering.
   *
   * @param req - Express request with query parameters.
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/results/query?batchId=xxx&search=2021-001&page=1&limit=20
   * ```
   */
  async queryResults(req: Request, res: Response): Promise<void> {
    const validatedQuery = queryResultSchema.parse(req.query);
    const data = await resultService.queryResults(validatedQuery);

    sendSuccess(res, data, "Results retrieved successfully");
  }

  /**
   * Fetches results for a specific student by University ID or User UUID.
   *
   * Validates the `id` path parameter and delegates to
   * {@link ResultService.getStudentResults}.
   *
   * @param req - Express request with `id` path parameter.
   * @param res - Express response.
   *
   * @example
   * ```
   * GET /api/v1/results/student/2021-001
   * ```
   */
  async getStudentResults(req: Request, res: Response): Promise<void> {
    const { id } = studentParamSchema.parse(req.params);
    const results = await resultService.getStudentResults(id);

    sendSuccess(res, results, `Results for student '${id}' retrieved successfully`);
  }

  /**
   * Returns the current authenticated student's full result history.
   *
   * Resolves the student identifier from the JWT token (preferring `universityId`,
   * falling back to `userId`) and delegates to {@link ResultService.getStudentResults}.
   *
   * @param req - Express request with authenticated user.
   * @param res - Express response.
   * @throws {AppError} `UNAUTHORIZED` (401) if no authenticated user is present.
   *
   * @example
   * ```
   * GET /api/v1/results/me
   * Authorization: Bearer <token>
   * ```
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
   * Fetches batch and semester analytics summary.
   *
   * Extracts `batchId` and `semesterId` from path parameters and delegates
   * to {@link ResultService.getBatchSemesterSummary} for aggregate statistics
   * (average GPA, highest GPA, pass rate).
   *
   * @param req - Express request with `batchId` and `semesterId` path parameters.
   * @param res - Express response.
   * @throws {AppError} `INVALID_PARAMS` (400) if either path parameter is missing.
   * @throws {AppError} `NOT_FOUND` (404) if no results exist for the batch/semester.
   *
   * @example
   * ```
   * GET /api/v1/results/batch/batch-uuid/semester/semester-uuid
   * ```
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
