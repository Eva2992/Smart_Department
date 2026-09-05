import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { preloadedService, PreloadedService } from "./preloaded.service.js";
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
import type { User, RefreshToken } from "@prisma/client";

export type { User, RefreshToken };

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

/**
 * Authentication and Identity Management Service (FR-01, FR-03, FR-04, FR-05, NFR-08).
 *
 * Implements:
 * - Preloaded roster validation and immediate single-step registration (ADR-0006).
 * - Secure login with bcrypt hash verification and 5-attempt brute-force lockout mechanics.
 * - Dual-token issuance (15-minute access token, 7-day cryptographically hashed refresh token).
 * - Token rotation and revocation across password changes and explicit logouts.
 * - Self-service single-use password reset workflows.
 */
export class AuthService {
  /**
   * Registers a new student, CR, or faculty member using preloaded roster validation (FR-01, AN-01, AN-02).
   *
   * In accordance with ADR-0006:
   * 1. Public registration for the `ADMIN` role is strictly rejected.
   * 2. Checks that the institutional email is not already registered.
   * 3. Students/CRs are verified via {@link PreloadedService.verifyStudentRoster}; their batch and program are auto-derived.
   * 4. Teachers are verified via {@link PreloadedService.verifyTeacherRoster} by email.
   * 5. Passwords are salted and hashed with bcrypt (cost factor 10).
   * 6. The account activates immediately (`isVerified: true`) without requiring email verification.
   * 7. Creates an active {@link User} entity and issues an initial session token pair with a persisted {@link RefreshToken}.
   *
   * @param dto - Registration payload containing user credentials and roster identifiers.
   * @returns An object containing the serialized {@link UserResponse} and issued session tokens.
   * @throws {AppError} 403 `FORBIDDEN` if registration is attempted for the `ADMIN` role.
   * @throws {AppError} 409 `USER_ALREADY_EXISTS` if an account already exists with the provided email.
   * @throws {AppError} 400 `MISSING_UNIVERSITY_ID` if a student or CR registers without a University ID.
   * @throws {AppError} 400 `PRELOADED_VERIFICATION_FAILED` if provided credentials do not match preloaded records.
   *
   * @example
   * ```ts
   * const session = await authService.register({
   *   name: "Sumon Paul",
   *   email: "sumon.52@juniv.edu",
   *   password: "securePassword123",
   *   role: "STUDENT",
   *   universityId: "20220654999",
   * });
   * console.log(`Welcome ${session.user.name}! Token: ${session.accessToken}`);
   * ```
   */
  public async register(
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
   * Authenticates user credentials and issues a JWT session token pair (FR-03, NFR-08).
   *
   * Security Invariants:
   * - Validates password using bcrypt constant-time comparison against `passwordHash` of the {@link User}.
   * - Brute-force protection: Tracks `failedAttempts`. On 5 failed attempts, sets `lockedUntil` for 15 minutes
   *   and writes an audit entry (`LOGIN_LOCKOUT`).
   * - Resets failed attempts to 0 and clears `lockedUntil` upon successful authentication.
   * - Issues a 15-minute JWT access token with user role and academic claims.
   * - Persists a 7-day SHA-256 hashed {@link RefreshToken} in the database for secure rotation.
   *
   * @param dto - Login credentials (`email` and `password`).
   * @returns Authenticated user profile and session token pair.
   * @throws {AppError} 401 `INVALID_CREDENTIALS` if email is not found or password verification fails.
   * @throws {AppError} 403 `ACCOUNT_LOCKED` if the account is currently locked out from excessive failed attempts.
   *
   * @example
   * ```ts
   * const session = await authService.login({
   *   email: "faculty@juniv.edu",
   *   password: "secretPassword123",
   * });
   * console.log(`Logged in as: ${session.user.role}`);
   * ```
   */
  public async login(
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
   * Refreshes the session access token and rotates the refresh token (NFR-08).
   *
   * Verifies the cryptographic signature of the raw refresh token, matches its SHA-256
   * hash against persisted {@link RefreshToken} database records, validates non-revocation and expiration,
   * immediately revokes the consumed token, and issues a fresh token pair.
   *
   * @param rawRefreshToken - Raw, unhashed JWT refresh token string received from client.
   * @returns A promise resolving to the newly generated {@link AuthTokens} pair.
   * @throws {AppError} 400 `MISSING_REFRESH_TOKEN` if the refresh token string is empty.
   * @throws {AppError} 401 `INVALID_REFRESH_TOKEN` if token verification fails, or the token is expired/revoked.
   *
   * @example
   * ```ts
   * const newTokens = await authService.refreshTokens(clientRefreshToken);
   * console.log(`New Access Token: ${newTokens.accessToken}`);
   * ```
   */
  public async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
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
   * Terminates user session by revoking active {@link RefreshToken} records in the database.
   *
   * Supports revoking an individual token by raw string or all active tokens for a given user ID.
   *
   * @param rawRefreshToken - Optional specific refresh token string to revoke.
   * @param userId - Optional user identifier to invalidate all concurrent sessions.
   * @returns An object indicating `{ success: true }`.
   *
   * @example
   * ```ts
   * await authService.logout(userRefreshToken);
   * ```
   */
  public async logout(rawRefreshToken?: string, userId?: string): Promise<{ success: boolean }> {
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
   * Retrieves the sanitized profile of an authenticated user by primary key.
   *
   * @param userId - Unique database identifier of the user.
   * @returns The user's {@link UserResponse} profile representation.
   * @throws {AppError} 404 `USER_NOT_FOUND` if the user cannot be located.
   *
   * @example
   * ```ts
   * const user = await authService.getMe("usr_101");
   * console.log(`User name: ${user.name}`);
   * ```
   */
  public async getMe(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return toUserResponse(user);
  }

  /**
   * Changes the password for an authenticated user and revokes all active sessions (FR-04, NFR-08).
   *
   * Validates the current password, computes a new bcrypt hash (cost factor 10),
   * revokes all outstanding refresh tokens to force re-authentication across all client devices,
   * and records an audit log entry.
   *
   * @param userId - Unique database identifier of the authenticated user.
   * @param currentPassword - The user's current password for verification.
   * @param newPassword - The new password meeting complexity criteria (minimum 8 characters).
   * @returns An object with `success: true` and a confirmation message.
   * @throws {AppError} 404 `USER_NOT_FOUND` if the user record does not exist.
   * @throws {AppError} 401 `INVALID_CURRENT_PASSWORD` if current password verification fails.
   *
   * @example
   * ```ts
   * const result = await authService.changePassword(
   *   "usr_101",
   *   "currentSecret123",
   *   "newSecurePassword456"
   * );
   * ```
   */
  public async changePassword(
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
   * Initiates the self-service password reset flow for an unauthenticated user (FR-05, Step 1).
   *
   * Generates a cryptographically secure, single-use token (1-hour expiry), saves it
   * to the user record, and dispatches a password reset email via SendGrid.
   *
   * @param email - The institutional email address associated with the account.
   * @returns An object with `success: true` and a delivery confirmation message.
   * @throws {AppError} 404 `USER_NOT_FOUND` if no account is registered with the given email.
   *
   * @example
   * ```ts
   * await authService.forgotPassword("student@juniv.edu");
   * ```
   */
  public async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
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
   * Resets user password using a valid, non-expired single-use token (FR-05, Step 2).
   *
   * Verifies the token existence and expiration window, computes a new bcrypt hash (cost factor 10),
   * clears the token to prevent reuse, and revokes all active sessions to force re-authentication (NFR-08).
   *
   * @param token - Single-use reset token string from the reset email link.
   * @param newPassword - New password meeting the minimum 8-character policy.
   * @returns An object with `success: true` and confirmation message.
   * @throws {AppError} 400 `INVALID_RESET_TOKEN` if token cannot be found.
   * @throws {AppError} 400 `TOKEN_EXPIRED` if the reset token has elapsed its 1-hour lifespan.
   *
   * @example
   * ```ts
   * await authService.resetPassword("token_abc123", "freshPassword789");
   * ```
   */
  public async resetPassword(
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
   * Revokes all active (non-revoked) refresh tokens for a specified user in the database.
   * Enforces global session invalidation across all user devices (NFR-08).
   *
   * @param userId - Unique database identifier of the target user.
   */
  private async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });
  }
}

/**
 * Singleton instance of {@link AuthService} exported for application-wide authentication operations.
 */
export const authService = new AuthService();
