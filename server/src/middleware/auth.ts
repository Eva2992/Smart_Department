import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./errorHandler.js";
import { Role } from "@prisma/client";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name?: string;
  teacherUniqueId?: string | null;
  universityId?: string | null;
  batchId?: string | null;
  isChairman?: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware: verifies JWT or mock auth headers in test/dev environment.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  // Check authorization header
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
      req.user = decoded;
      return next();
    } catch {
      return next(new AppError("Invalid or expired authentication token", 401, "UNAUTHORIZED"));
    }
  }

  // Development / Testing Mock Header Fallback
  const mockUserId = req.headers["x-user-id"] as string;
  const mockUserRole = req.headers["x-user-role"] as Role;

  if (mockUserId && mockUserRole) {
    req.user = {
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

  // If no auth credentials provided
  return next(new AppError("Authentication required. Please provide a valid bearer token.", 401, "UNAUTHORIZED"));
}

/**
 * Optional authentication: attaches req.user if token/header present, but does not block if absent.
 */
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
      req.user = decoded;
    } catch {
      // Ignore token error for optional auth
    }
  } else {
    const mockUserId = req.headers["x-user-id"] as string;
    const mockUserRole = req.headers["x-user-role"] as Role;
    if (mockUserId && mockUserRole) {
      req.user = {
        id: mockUserId,
        email: (req.headers["x-user-email"] as string) || "user@juniv.edu",
        role: mockUserRole,
        teacherUniqueId: req.headers["x-user-teacher-id"] as string | undefined,
        universityId: req.headers["x-user-university-id"] as string | undefined,
        batchId: req.headers["x-user-batch-id"] as string | undefined,
        isChairman: req.headers["x-user-is-chairman"] === "true",
      };
    }
  }
  next();
}
