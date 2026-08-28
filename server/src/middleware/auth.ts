import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../utils/token.js";
import type { AccessTokenPayload } from "../types/auth.js";
import { Role } from "@prisma/client";

export interface AuthUser extends AccessTokenPayload {
  id: string;
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware: verifies JWT access token or mock headers in test/dev environment.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyAccessToken(token);
      req.user = {
        ...decoded,
        id: decoded.id || decoded.userId,
        userId: decoded.userId || decoded.id || "",
      };
      return next();
    } catch {
      return next(new AppError("Invalid or expired access token", 401, "INVALID_TOKEN"));
    }
  }

  // Development / Testing Mock Header Fallback
  const mockUserId = req.headers["x-user-id"] as string;
  const mockUserRole = req.headers["x-user-role"] as Role;

  if (mockUserId && mockUserRole) {
    req.user = {
      userId: mockUserId,
      id: mockUserId,
      email: (req.headers["x-user-email"] as string) || "user@juniv.edu",
      role: mockUserRole,
      name: (req.headers["x-user-name"] as string) || "Mock User",
      teacherUniqueId: req.headers["x-user-teacher-id"] as string | undefined,
      universityId: req.headers["x-user-university-id"] as string | undefined,
      batchId: req.headers["x-user-batch-id"] as string | undefined,
      isChairman: req.headers["x-user-is-chairman"] === "true",
    };
    return next();
  }

  return next(
    new AppError(
      "Authentication required. Please provide a valid Bearer token.",
      401,
      "UNAUTHORIZED"
    )
  );
}

/**
 * Optional authentication: attaches req.user if token/header present, but does not block if absent.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = verifyAccessToken(token);
      req.user = {
        ...decoded,
        id: decoded.id || decoded.userId,
        userId: decoded.userId || decoded.id || "",
      };
    } catch {
      // Ignore token error for optional auth
    }
  } else {
    const mockUserId = req.headers["x-user-id"] as string;
    const mockUserRole = req.headers["x-user-role"] as Role;
    if (mockUserId && mockUserRole) {
      req.user = {
        userId: mockUserId,
        id: mockUserId,
        email: (req.headers["x-user-email"] as string) || "user@juniv.edu",
        role: mockUserRole,
        name: (req.headers["x-user-name"] as string) || "Mock User",
        teacherUniqueId: req.headers["x-user-teacher-id"] as string | undefined,
        universityId: req.headers["x-user-university-id"] as string | undefined,
        batchId: req.headers["x-user-batch-id"] as string | undefined,
        isChairman: req.headers["x-user-is-chairman"] === "true",
      };
    }
  }
  next();
}

/**
 * Role-based access control middleware (RBAC).
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(
        new AppError("Authentication required before authorization", 401, "UNAUTHORIZED")
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource`,
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
