import type { Response } from "express";
import type { AppError } from "../middleware/errorHandler.js";

/**
 * Standard JSON API response envelope for all Smart Department REST endpoints.

 *
 * Enforces uniform response shapes across successful data queries, resource mutations,
 * validation errors, and exceptional conditions.
 *
 * @typeParam T - The type of the payload data returned in the response.
 */
export interface ApiResponse<T = unknown> {
  /**
   * Indicates whether the HTTP request was processed successfully (`true`)
   * or resulted in a operational or runtime error (`false`).
   */
  success: boolean;

  /**
   * Optional human-readable message summarizing the outcome of the operation
   * or providing context for client-side toast notifications.
   */
  message?: string;

  /**
   * The response payload containing entity models, collections, or mutation results.
   * Present only on successful responses.
   */
  data?: T;

  /**
   * Detailed error container populated when {@link ApiResponse.success} is `false`.
   */
  error?: {
    /**
     * Machine-readable error classification code (e.g., `'VALIDATION_ERROR'`, `'NOT_FOUND'`).
     */
    code?: string;

    /**
     * Contextual metadata, validation issue lists, or developer debug information.
     */
    details?: unknown;
  };
}

/**
 * Dispatches a standard HTTP success response wrapped in an {@link ApiResponse} envelope.
 *
 * @typeParam T - The type of the payload data.
 * @param res - The Express response object.
 * @param data - The payload data to serialize into the response body.
 * @param message - Optional descriptive success message for the client.
 * @param statusCode - HTTP status code (defaults to 200 OK).
 * @returns The Express response object sending the serialized JSON payload.
 *
 * @example
 * ```ts
 * sendSuccess(res, { id: "usr_123", email: "student@juniv.edu" }, "User retrieved successfully");
 * ```
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response {
  const payload: ApiResponse<T> = {
    success: true,
    ...(message ? { message } : {}),
    data,
  };
  return res.status(statusCode).json(payload);
}

/**
 * Dispatches an HTTP `201 Created` response wrapped in an {@link ApiResponse} envelope
 * via {@link sendSuccess}.
 *
 * @typeParam T - The type of the newly created entity.
 * @param res - The Express response object.
 * @param data - The newly created resource entity or identifier.
 * @param message - Descriptive success message (defaults to `"Resource created successfully"`).
 * @returns The Express response object sending the serialized JSON payload.
 *
 * @example
 * ```ts
 * sendCreated(res, newCourse, "Course registered successfully");
 * ```
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message = "Resource created successfully"
): Response {
  return sendSuccess(res, data, message, 201);
}

/**
 * Dispatches a standardized error response wrapped in an {@link ApiResponse} envelope.
 *
 * Typically invoked directly by controllers or globally by the centralized error handling
 * middleware when serializing operational exceptions (such as {@link AppError}) or unhandled faults.
 *
 * @param res - The Express response object.
 * @param message - Human-readable, client-safe error message.
 * @param statusCode - HTTP status code (defaults to 500 Internal Server Error).
 * @param code - Optional machine-readable error classification code (e.g., `'FORBIDDEN'`, `'NOT_FOUND'`).
 * @param details - Optional error details, field-level validation errors, or debug info.
 * @returns The Express response object sending the serialized error JSON.
 *
 * @example
 * ```ts
 * sendError(res, "Resource not found", 404, "NOT_FOUND");
 * ```
 */
export function sendError(
  res: Response,
  message: string,
  statusCode = 500,
  code?: string,
  details?: unknown
): Response {
  const payload: ApiResponse = {
    success: false,
    message,
    error: {
      ...(code ? { code } : {}),
      ...(details !== undefined ? { details } : {}),
    },
  };
  return res.status(statusCode).json(payload);
}
