import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";
import { verifyAccessToken } from "../utils/token.js";
import type { AccessTokenPayload } from "../types/auth.js";
import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Middleware to authenticate JWT access token from Authorization header.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Authentication required. Please provide a valid Bearer token.", 401, "UNAUTHORIZED");
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    throw new AppError("Invalid or expired access token", 401, "INVALID_TOKEN");
  }
}

/**
 * Middleware to authorize specific roles (RBAC).
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Authentication required before authorization", 401, "UNAUTHORIZED");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource`,
        403,
        "FORBIDDEN"
      );
    }

    next();
  };
}
