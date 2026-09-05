import type { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AppError } from "./errorHandler.js";

/**
 * Role-based access control (RBAC) middleware factory.
 *
 * Restricts access to routes based on the authenticated user's assigned {@link Role}.
 *
 * @param allowedRoles - List of permitted roles allowed to execute the protected route.
 * @returns Express middleware function enforcing role authorization.
 * @throws {AppError} 401 `UNAUTHORIZED` if the request lacks an authenticated user context.
 * @throws {AppError} 403 `FORBIDDEN` if the user's role is not included in `allowedRoles`.
 *
 * @example
 * ```ts
 * router.delete("/records/:id", authenticate, authorize(Role.ADMIN), controller.deleteRecord);
 * ```
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
 * Canonical alias for {@link authorize}.
 *
 * @example
 * ```ts
 * router.get("/admin", authenticate, authorizeRole(Role.ADMIN), controller.getAdminData);
 * ```
 */
export const authorizeRole = authorize;

/**
 * Convenience middleware requiring Administrator privileges (`Role.ADMIN`).
 *
 * @example
 * ```ts
 * router.post("/system-settings", authenticate, requireAdmin, controller.updateSettings);
 * ```
 */
export const requireAdmin = authorize(Role.ADMIN);

/**
 * Convenience middleware requiring Teacher or Class Representative privileges (`Role.TEACHER` or `Role.CR`).
 *
 * Used for routine management, slot rescheduling, and academic resource uploads.
 *
 * @example
 * ```ts
 * router.post("/schedule/reschedule", authenticate, requireTeacherOrCR, controller.rescheduleSlot);
 * ```
 */
export const requireTeacherOrCR = authorize(Role.TEACHER, Role.CR);

/**
 * Department Chairman role check middleware.
 *
 * Permits access only to faculty members holding the Chairman designation or system administrators.
 *
 * @param req - The Express request object containing `req.user`.
 * @param _res - The Express response object.
 * @param next - The Express next middleware callback.
 * @returns Nothing (`void`).
 * @throws {AppError} 401 `UNAUTHORIZED` if the request is unauthenticated.
 * @throws {AppError} 403 `FORBIDDEN` if the user is neither an Admin nor designated Chairman.
 *
 * @example
 * ```ts
 * router.post("/exams/sign-off", authenticate, requireChairman, controller.signOffExam);
 * ```
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
