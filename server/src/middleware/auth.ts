import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../utils/token.js";
import type { AccessTokenPayload } from "../types/auth.js";
import { Role } from "@prisma/client";

/**
 * Authenticated user context populated on the Express request object (`req.user`).
 *
 * Extends {@link AccessTokenPayload} with normalized `id` and `userId` aliases.
 *
 * @example
 * ```ts
 * const authUser: AuthUser = {
 *   userId: "usr_1",
 *   id: "usr_1",
 *   email: "student@juniv.edu",
 *   role: Role.STUDENT,
 *   name: "Zahir Hossain",
 * };
 * ```
 */
export interface AuthUser extends AccessTokenPayload {
  /** Unique primary key identifier of the authenticated user. */
  id: string;

  /** Canonical user ID matching {@link AccessTokenPayload.userId}. */
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      /**
       * Authenticated user session claims attached by {@link authenticate} or {@link optionalAuthenticate}.
       */
      user?: AuthUser;
    }
  }
}

/**
 * Mandatory authentication guard middleware (NFR-08).
 *
 * Extracts the JWT access token from the HTTP `Authorization: Bearer <token>` header,
 * cryptographically verifies its validity, and populates `req.user`.
 * In development or testing environments, accepts mock user headers (`x-user-id`, `x-user-role`).
 *
 * @param req - The Express request object containing authorization headers.
 * @param _res - The Express response object.
 * @param next - The Express next middleware callback.
 * @returns Nothing (`void`).
 * @throws {AppError} 401 `INVALID_TOKEN` if the access token has expired or signature verification fails.
 * @throws {AppError} 401 `UNAUTHORIZED` if no Bearer token or mock credentials are provided.
 *
 * @example
 * ```ts
 * router.get("/protected", authenticate, controller.getProtectedData);
 * ```
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
 * Optional authentication middleware.
 *
 * Inspects incoming headers and populates `req.user` if a valid Bearer token or mock header
 * is present, but does not interrupt the request pipeline if credentials are missing or expired.
 *
 * @param req - The Express request object.
 * @param _res - The Express response object.
 * @param next - The Express next middleware callback.
 * @returns Nothing (`void`).
 *
 * @example
 * ```ts
 * router.get("/public-or-personal", optionalAuthenticate, controller.viewContent);
 * ```
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
 * Role-based access control (RBAC) middleware generator.
 *
 * Restricts endpoint execution to users whose authenticated role matches one of `allowedRoles`.
 *
 * @param allowedRoles - Variadic list of allowed {@link Role} values.
 * @returns Express middleware function enforcing role authorization.
 * @throws {AppError} 401 `UNAUTHORIZED` if `req.user` is not populated.
 * @throws {AppError} 403 `FORBIDDEN` if `req.user.role` is not in `allowedRoles`.
 *
 * @example
 * ```ts
 * router.post("/admin-only", authenticate, authorize(Role.ADMIN), controller.doAdminAction);
 * ```
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
 * Department Chairman privilege authorization guard.
 *
 * Asserts that the authenticated user either possesses the `ADMIN` role or is a faculty member
 * designated as the Department Chairman (`isChairman: true`).
 *
 * @param req - The Express request object containing `req.user`.
 * @param _res - The Express response object.
 * @param next - The Express next middleware callback.
 * @returns Nothing (`void`).
 * @throws {AppError} 401 `UNAUTHORIZED` if the request is unauthenticated.
 * @throws {AppError} 403 `FORBIDDEN` if the user lacks Chairman or Admin status.
 *
 * @example
 * ```ts
 * router.post("/chairman-approval", authenticate, requireChairman, controller.approveRequest);
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
