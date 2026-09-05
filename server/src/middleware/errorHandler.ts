import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { sendError } from "../utils/response.js";
import type { sendSuccess } from "../utils/response.js";
import { env } from "../config/env.js";

/**
 * Custom operational error class for anticipated domain, business logic, and HTTP failures.
 *
 * Extends the native JavaScript `Error` by attaching an HTTP status code,
 * an optional machine-readable error classification code, and optional structured metadata.
 * Instances of this class are intercepted by {@link errorHandler} and converted to
 * standardized JSON envelopes using {@link sendError}.
 *
 * @example
 * ```ts
 * throw new AppError("Room R-101 is already booked during this time slot", 409, "ROOM_CONFLICT");
 * ```
 */
export class AppError extends Error {
  /**
   * HTTP status code associated with this error (e.g., 400, 401, 403, 404, 409, 500).
   */
  public statusCode: number;

  /**
   * Optional machine-readable classification code (e.g., `'VALIDATION_ERROR'`, `'UNAUTHORIZED'`).
   */
  public code?: string;

  /**
   * Optional structured metadata or diagnostic details providing context for the failure.
   */
  public details?: unknown;

  /**
   * Creates a new instance of {@link AppError}.
   *
   * @param message - Human-readable error description explaining the failure reason.
   * @param statusCode - HTTP status code for the response (defaults to 500).
   * @param code - Optional machine-readable error code string.
   * @param details - Optional additional metadata or debugging context.
   */
  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Express catch-all middleware for handling unmatched route endpoints.
 *
 * Formats a client-safe 404 Not Found error response utilizing {@link sendError}
 * with the code `'NOT_FOUND'`.
 *
 * @param req - The Express request object containing the attempted HTTP method and URL.
 * @param res - The Express response object used to deliver the error payload.
 * @returns Nothing (`void`).
 *
 * @example
 * ```ts
 * app.use(notFoundHandler);
 * ```
 */
export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND");
}

/**
 * Centralized global Express error-handling middleware for the Smart Department API.
 *
 * Intercepts synchronous exceptions and asynchronous promise rejections across all routes and controllers:
 * - {@link AppError}: Formatted with its specific status code, error code, and attached details.
 * - `ZodError`: Formatted as HTTP 400 `'VALIDATION_ERROR'` with an array of field paths and validation messages.
 * - `SyntaxError`: Malformed JSON request bodies mapped to HTTP 400 `'INVALID_JSON'`.
 * - Unhandled system/database errors: Logged to stderr, sanitized to avoid leaking sensitive internal details,
 *   and dispatched as HTTP 500 `'INTERNAL_SERVER_ERROR'`. In development mode, stack traces are safely exposed in details.
 *
 * In contrast to standard payloads delivered by {@link sendSuccess}, errors intercepted here
 * are serialized uniformly via {@link sendError}.
 *
 * @param err - The intercepted error object, exception, or rejection.
 * @param _req - The Express request object.
 * @param res - The Express response object used to deliver the error payload.
 * @param _next - The Express next middleware function callback.
 * @returns Nothing (`void`).
 *
 * @example
 * ```ts
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const formatted = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    const primaryMessage = err.issues[0]?.message || "Validation failed";
    sendError(res, primaryMessage, 400, "VALIDATION_ERROR", formatted);
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    sendError(res, "Malformed JSON request body", 400, "INVALID_JSON");
    return;
  }

  // Always log the full unexpected error on the server
  console.error("Unhandled Error:", err);

  // Friendly error message for the client - never leak database or stack internals
  const isPrismaOrDbError =
    err instanceof Error &&
    (err.name.includes("Prisma") ||
      err.message.includes("invocation in") ||
      err.message.includes("database"));

  const userFriendlyMessage = isPrismaOrDbError
    ? "A database connection or system error occurred. Please try again shortly."
    : "An unexpected system error occurred. Please try again shortly.";

  const details = env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined;

  sendError(res, userFriendlyMessage, 500, "INTERNAL_SERVER_ERROR", details);
}
