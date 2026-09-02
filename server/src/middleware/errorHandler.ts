import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { sendError } from "../utils/response.js";
import { env } from "../config/env.js";

export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: unknown;

  constructor(message: string, statusCode = 500, code?: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, `Cannot ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND");
}

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

  const details =
    env.NODE_ENV === "development" && err instanceof Error ? err.stack : undefined;

  sendError(res, userFriendlyMessage, 500, "INTERNAL_SERVER_ERROR", details);
}
