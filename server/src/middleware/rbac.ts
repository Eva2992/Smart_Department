import type { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AppError } from "./errorHandler.js";

/**
 * Role-based access control middleware.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Requires one of [${allowedRoles.join(", ")}], but current role is ${req.user.role}.`,
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
}

/**
 * Chairman role check middleware.
 */
export function requireChairman(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
  }

  if (req.user.role === Role.ADMIN || req.user.isChairman) {
    return next();
  }

  return next(new AppError("Chairman privileges required for this action", 403, "FORBIDDEN"));
}
