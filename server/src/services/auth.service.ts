import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { preloadedService } from "./preloaded.service.js";
import { emailService } from "./email.service.js";
import { auditService } from "./audit.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  generateResetPasswordToken,
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
   * Automatically activates account and issues JWT access and refresh tokens.
   */
  async register(
    dto: RegisterDto
  ): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    const { name, email, password, role, universityId } = dto;
    let { teacherUniqueId, batchId, program } = dto;
    const normalizedEmail = email.trim().toLowerCase();

    if (role === "ADMIN") {
      throw new AppError("Admin accounts cannot be registered publicly.", 403, "FORBIDDEN");
    }

    // 1. Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError(
        "An account is already registered with this email address.",
        409,
        "USER_ALREADY_EXISTS"
      );
    }

    let isChairman = false;
    let finalName = name;

    // 2. Preloaded verification per role
    if (role === "STUDENT" || role === "CR") {
      if (!universityId) {
        throw new AppError(
          "University ID is required for student registration",
          400,
          "MISSING_UNIVERSITY_ID"
        );
      }

      const rosterCheck = await preloadedService.verifyStudentRoster({
        universityId,
        email: normalizedEmail,
        batchId,
        program,
      });

      if (!rosterCheck.valid || !rosterCheck.preloadedRecord) {
        throw new AppError(
          rosterCheck.error ||
            "Your University ID or Email does not match the official department roster. Please contact the department admin.",
          400,
          "PRELOADED_VERIFICATION_FAILED"
        );
      }

      batchId = rosterCheck.preloadedRecord.batchId;
      program = rosterCheck.preloadedRecord.program;

      if (!finalName) {
        finalName = rosterCheck.preloadedRecord.name;
      }
    } else if (role === "TEACHER") {
      const rosterCheck = await preloadedService.verifyTeacherRoster({
        email: normalizedEmail,
        teacherUniqueId,
      });

      if (!rosterCheck.valid || !rosterCheck.preloadedRecord) {
        throw new AppError(
          rosterCheck.error ||
            "This email address is not registered in the department faculty directory. Please contact the department admin.",
          400,
          "PRELOADED_VERIFICATION_FAILED"
        );
      }

      isChairman = rosterCheck.preloadedRecord.isChairman;
      teacherUniqueId = rosterCheck.preloadedRecord.uniqueId;
      if (!finalName) {
        finalName = rosterCheck.preloadedRecord.name;
      }
    }

    // 3. Hash password (cost factor 10)
    const passwordHash = await bcrypt.hash(password, 10);

    // 4. Create user in active and verified state immediately
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
        isVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
        failedAttempts: 0,
      },
    });

    // 5. Generate session tokens (auto-login)
    const accessPayload: AccessTokenPayload = {
      userId: createdUser.id,
      email: createdUser.email,
      role: createdUser.role,
      name: createdUser.name,
      universityId: createdUser.universityId,
      teacherUniqueId: createdUser.teacherUniqueId,
      batchId: createdUser.batchId,
      program: createdUser.program,
      isChairman: createdUser.isChairman,
    };

    const accessToken = generateAccessToken(accessPayload);
    const rawRefreshToken = generateRefreshToken({ userId: createdUser.id });
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId: createdUser.id,
        tokenHash,
        expiresAt,
        revoked: false,
      },
    });

    return {
      user: toUserResponse(createdUser),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  /**
   * Logs in user with JWT Access + Hashed Refresh Token session (FR-03, NFR-08).
   */
  async login(
    dto: LoginDto
  ): Promise<{ user: UserResponse; accessToken: string; refreshToken: string }> {
    const { email, password } = dto;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError(
        "The email or password you entered is incorrect.",
        401,
        "INVALID_CREDENTIALS"
      );
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
        await auditService.logAction({
          userId: user.id,
          action: "LOGIN_LOCKOUT",
          entityType: "USER",
          entityId: user.id,
          details: { attempts: newAttempts },
        });
        throw new AppError(
          "Too many failed login attempts. Your account has been temporarily locked for 15 minutes.",
          403,
          "ACCOUNT_LOCKED"
        );
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { failedAttempts: newAttempts },
        });
        await auditService.logAction({
          userId: user.id,
          action: "LOGIN_FAILURE",
          entityType: "USER",
          entityId: user.id,
          details: { reason: "INVALID_PASSWORD", attempts: newAttempts },
        });
        throw new AppError(
          "The email or password you entered is incorrect.",
          401,
          "INVALID_CREDENTIALS"
        );
      }
    }

    // Reset lockout and failed attempts upon successful login
    if (user.failedAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });
    }

    // Log successful authentication
    await auditService.logAction({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      details: { role: user.role },
    });

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

  /**
   * Changes password for an authenticated user (FR-04).
   * Validates current password, enforces password strength, updates hash,
   * and revokes ALL active refresh tokens to force re-authentication.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new AppError("Current password is incorrect", 401, "INVALID_CURRENT_PASSWORD");
    }

    // Hash new password (cost factor 10, NFR-06)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke all active sessions (NFR-08)
    await this.revokeAllUserTokens(userId);

    await auditService.logAction({
      userId,
      action: "PASSWORD_CHANGE",
      entityType: "USER",
      entityId: userId,
    });

    return {
      success: true,
      message: "Password changed successfully. Please log in again.",
    };
  }

  /**
   * Initiates password reset flow for an unauthenticated user (FR-05, Step 1).
   * Generates a cryptographically secure, single-use token (1-hour expiry) and
   * dispatches a reset email via SendGrid.
   * If email is not registered, throws an AppError with 404.
   */
  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError("Email not found", 404, "USER_NOT_FOUND");
    }

    // Generate single-use reset token (1-hour expiry)
    const { token: resetToken, expiresAt: resetTokenExpiry } = generateResetPasswordToken();

    // Save reset token to user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpiry: resetTokenExpiry,
      },
    });

    // Dispatch reset email via SendGrid
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      success: true,
      message: "Password reset link has been sent to your email.",
    };
  }

  /**
   * Resets password using a valid, non-expired reset token (FR-05, Step 2).
   * Validates token, updates password hash, clears token, and revokes all sessions.
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400, "INVALID_RESET_TOKEN");
    }

    // Check token expiry
    if (user.resetPasswordTokenExpiry && user.resetPasswordTokenExpiry < new Date()) {
      throw new AppError(
        "Reset token has expired. Please request a new one.",
        400,
        "TOKEN_EXPIRED"
      );
    }

    // Hash new password (cost factor 10, NFR-06)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token (single-use)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      },
    });

    // Revoke all active sessions (NFR-08)
    await this.revokeAllUserTokens(user.id);

    await auditService.logAction({
      userId: user.id,
      action: "PASSWORD_RESET",
      entityType: "USER",
      entityId: user.id,
    });

    return {
      success: true,
      message: "Password reset successfully. Please log in with your new password.",
    };
  }

  /**
   * Revokes ALL active (non-revoked) refresh tokens for a given user.
   * Used by changePassword and resetPassword to force re-authentication
   * across all devices (NFR-08).
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}

export const authService = new AuthService();
