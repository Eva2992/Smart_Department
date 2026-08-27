import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { preloadedService } from "./preloaded.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  hashToken,
} from "../utils/token.js";
import type {
  RegisterDto,
  LoginDto,
  UserResponse,
  AuthTokens,
  AccessTokenPayload,
} from "../types/auth.js";
import type { User } from "@prisma/client";

function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    universityId: user.universityId,
    teacherUniqueId: user.teacherUniqueId,
    batchId: user.batchId,
    program: user.program,
    isChairman: user.isChairman,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export class AuthService {
  /**
   * Registers a new user with preloaded roster verification (FR-01, AN-01, AN-02).
   */
  async register(dto: RegisterDto): Promise<{ user: UserResponse; verificationToken: string }> {
    const { name, email, password, role, universityId, teacherUniqueId, batchId, program } = dto;
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError("A user with this email already exists", 409, "USER_ALREADY_EXISTS");
    }

    let isChairman = false;
    let finalName = name;

    // 2. Preloaded verification per role
    if (role === "STUDENT" || role === "CR") {
      if (!universityId) {
        throw new AppError("University ID is required for student registration", 400, "MISSING_UNIVERSITY_ID");
      }

      const rosterCheck = await preloadedService.verifyStudentRoster({
        universityId,
        email: normalizedEmail,
        batchId,
        program,
      });

      if (!rosterCheck.valid || !rosterCheck.preloadedRecord) {
        throw new AppError(
          rosterCheck.error || "Your information does not match our records. Please contact the department admin.",
          400,
          "PRELOADED_VERIFICATION_FAILED"
        );
      }

      if (!finalName) {
        finalName = rosterCheck.preloadedRecord.name;
      }
    } else if (role === "TEACHER") {
      if (!teacherUniqueId) {
        throw new AppError("Teacher Unique ID is required for teacher registration", 400, "MISSING_TEACHER_ID");
      }

      const rosterCheck = await preloadedService.verifyTeacherRoster({
        teacherUniqueId,
        email: normalizedEmail,
      });

      if (!rosterCheck.valid || !rosterCheck.preloadedRecord) {
        throw new AppError(
          rosterCheck.error || "Teacher verification failed. Please contact the department admin.",
          400,
          "PRELOADED_VERIFICATION_FAILED"
        );
      }

      isChairman = rosterCheck.preloadedRecord.isChairman;
      if (!finalName) {
        finalName = rosterCheck.preloadedRecord.name;
      }
    }

    // 3. Hash password (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Generate 24-hour verification token
    const { token: verificationToken, expiresAt: verificationTokenExpiry } = generateVerificationToken();

    // 5. Create user in inactive/unverified state
    const createdUser = await prisma.user.create({
      data: {
        name: finalName,
        email: normalizedEmail,
        passwordHash,
        role,
        universityId: universityId || null,
        teacherUniqueId: teacherUniqueId || null,
        batchId: batchId || null,
        program: program || null,
        isChairman,
        isVerified: false,
        verificationToken,
        verificationTokenExpiry,
        failedAttempts: 0,
      },
    });

    return {
      user: toUserResponse(createdUser),
      verificationToken,
    };
  }

  /**
   * Confirms email verification via token (FR-02).
   */
  async verifyEmail(token: string): Promise<{ success: boolean; message: string; user: UserResponse }> {
    if (!token) {
      throw new AppError("Verification token is required", 400, "INVALID_TOKEN");
    }

    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new AppError("Invalid or expired verification token", 400, "INVALID_TOKEN");
    }

    if (user.isVerified) {
      return {
        success: true,
        message: "Email is already verified",
        user: toUserResponse(user),
      };
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      throw new AppError("Verification token has expired. Please request a new one.", 400, "TOKEN_EXPIRED");
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return {
      success: true,
      message: "Email verified successfully! You can now log in.",
      user: toUserResponse(updatedUser),
    };
  }

  /**
   * Logs in user with JWT Access + Hashed Refresh Token session (FR-03, NFR-08).
   */
  async login(dto: LoginDto): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    const { email, password } = dto;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / (60 * 1000));
      throw new AppError(
        `Account is temporarily locked. Please try again after ${remainingMinutes} minute(s).`,
        403,
        "ACCOUNT_LOCKED"
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const newAttempts = user.failedAttempts + 1;
      if (newAttempts >= 5) {
        const lockoutDuration = 15 * 60 * 1000; // 15 minutes
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: newAttempts,
            lockedUntil: new Date(Date.now() + lockoutDuration),
          },
        });
        throw new AppError(
          "Too many failed login attempts. Your account has been locked for 15 minutes.",
          403,
          "ACCOUNT_LOCKED"
        );
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: newAttempts },
        });
        throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
      }
    }

    // Check email verification status
    if (!user.isVerified) {
      throw new AppError("Please verify your email address before logging in.", 403, "EMAIL_NOT_VERIFIED");
    }

    // Reset lockout and failed attempts upon successful login
    if (user.failedAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    // Issue tokens
    const accessPayload: AccessTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      universityId: user.universityId,
      teacherUniqueId: user.teacherUniqueId,
      batchId: user.batchId,
      program: user.program,
      isChairman: user.isChairman,
    };

    const accessToken = generateAccessToken(accessPayload);
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store hashed refresh token in database (NFR-08)
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        revoked: false,
      },
    });

    return {
      user: toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refreshes access token and rotates refresh token.
   */
  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    if (!rawRefreshToken) {
      throw new AppError("Refresh token is required", 400, "MISSING_REFRESH_TOKEN");
    }

    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const tokenHash = hashToken(rawRefreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new AppError("Refresh token has been revoked or expired", 401, "INVALID_REFRESH_TOKEN");
    }

    // Revoke used refresh token
    await prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revoked: true },
    });

    const user = tokenRecord.user;

    // Issue new pair of tokens
    const accessPayload: AccessTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      universityId: user.universityId,
      teacherUniqueId: user.teacherUniqueId,
      batchId: user.batchId,
      program: user.program,
      isChairman: user.isChairman,
    };

    const newAccessToken = generateAccessToken(accessPayload);
    const newRefreshToken = generateRefreshToken({ userId: user.id });
    const newTokenHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt,
        revoked: false,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logs out user by revoking active refresh token.
   */
  async logout(rawRefreshToken?: string, userId?: string): Promise<{ success: boolean }> {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { revoked: true },
      });
    } else if (userId) {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { revoked: true },
      });
    }

    return { success: true };
  }

  /**
   * Resends verification email with a fresh 24-hour token (FR-02).
   */
  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string; verificationToken?: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Return generic message to prevent email enumeration
      return {
        success: true,
        message: "If an account with this email exists and is unverified, a verification link has been sent.",
      };
    }

    if (user.isVerified) {
      return {
        success: true,
        message: "Your email is already verified. You can log in directly.",
      };
    }

    const { token: verificationToken, expiresAt: verificationTokenExpiry } = generateVerificationToken();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpiry,
      },
    });

    return {
      success: true,
      message: "Verification email sent successfully.",
      verificationToken,
    };
  }

  /**
   * Retrieves user profile by ID.
   */
  async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return toUserResponse(user);
  }
}

export const authService = new AuthService();
