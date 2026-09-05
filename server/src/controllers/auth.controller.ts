import type { Request, Response } from "express";
import { authService, AuthService } from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

/**
 * Authentication and User Identity Controller.
 *
 * Exposes Express request handlers for user registration, authentication,
 * JWT session refresh, user profile retrieval, and password modification/reset flows.
 */
export class AuthController {
  /**
   * Handles user account registration with preloaded roster verification (FR-01, AN-01, AN-02).
   *
   * Validates request body against {@link registerSchema}, invokes {@link AuthService.register},
   * and returns HTTP 201 Created via {@link sendCreated}.
   *
   * @param req - The Express request object with registration body.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} 400 `BAD_REQUEST` if preloaded roster check fails, email is in use, or role is invalid.
   *
   * @example
   * ```ts
   * authRouter.post("/register", authController.register);
   * ```
   */
  public async register(req: Request, res: Response): Promise<void> {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);

    sendCreated(res, result, "Account created successfully! You are now logged in.");
  }

  /**
   * Handles credential authentication and JWT session token generation (FR-03, NFR-08).
   *
   * Validates request body against {@link loginSchema}, delegates to {@link AuthService.login},
   * and returns HTTP 200 OK via {@link sendSuccess}.
   *
   * @param req - The Express request object with credentials.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} 401 `INVALID_CREDENTIALS` on incorrect password, or 423 `ACCOUNT_LOCKED` after 5 failed attempts.
   *
   * @example
   * ```ts
   * authRouter.post("/login", authController.login);
   * ```
   */
  public async login(req: Request, res: Response): Promise<void> {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);

    sendSuccess(res, result, "Login successful");
  }

  /**
   * Handles JWT access token refresh and refresh token rotation (NFR-08).
   *
   * Validates request body against {@link refreshTokenSchema}, executes {@link AuthService.refreshTokens},
   * and returns the rotated token pair.
   *
   * @param req - The Express request object with `refreshToken`.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} 401 `INVALID_TOKEN` if refresh token is revoked, expired, or invalid.
   *
   * @example
   * ```ts
   * authRouter.post("/refresh", authController.refresh);
   * ```
   */
  public async refresh(req: Request, res: Response): Promise<void> {
    const validatedData = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshTokens(validatedData.refreshToken);

    sendSuccess(res, tokens, "Tokens refreshed successfully");
  }

  /**
   * Handles user logout and session token revocation.
   *
   * Invalidates the provided refresh token or all active sessions for the authenticated user.
   *
   * @param req - The Express request object optionally containing `refreshToken` and `req.user`.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} If session revocation encounters a database error.
   *
   * @example
   * ```ts
   * authRouter.post("/logout", authController.logout);
   * ```
   */
  public async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.body?.refreshToken;
    const userId = req.user?.userId;

    await authService.logout(refreshToken, userId);
    sendSuccess(res, { success: true }, "Logged out successfully");
  }

  /**
   * Retrieves the profile details of the currently authenticated user.
   *
   * Requires prior execution of authentication middleware.
   *
   * @param req - The Express request object containing `req.user`.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} 401 `UNAUTHORIZED` if the request lacks an authenticated user context.
   *
   * @example
   * ```ts
   * authRouter.get("/me", authenticate, authController.getMe);
   * ```
   */
  public async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user?.userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const user = await authService.getMe(req.user.userId);
    sendSuccess(res, user, "User profile retrieved successfully");
  }

  /**
   * Changes the password for the currently authenticated user (FR-04).
   *
   * Validates input against {@link changePasswordSchema}, invokes {@link AuthService.changePassword},
   * and revokes all other active sessions.
   *
   * @param req - The Express request object containing `req.user` and current/new passwords.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} 401 `UNAUTHORIZED` if the request lacks an authenticated user context, or `INVALID_CREDENTIALS` if current password is incorrect.
   *
   * @example
   * ```ts
   * authRouter.post("/change-password", authenticate, authController.changePassword);
   * ```
   */
  public async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user?.userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const validatedData = changePasswordSchema.parse(req.body);
    const result = await authService.changePassword(
      req.user.userId,
      validatedData.currentPassword,
      validatedData.newPassword
    );

    sendSuccess(res, result, result.message);
  }

  /**
   * Initiates the self-service password reset process (FR-05, Step 1).
   *
   * Validates target email via {@link forgotPasswordSchema} and dispatches a reset token email.
   *
   * @param req - The Express request object containing user email.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} If email delivery or database update encounters an error.
   *
   * @example
   * ```ts
   * authRouter.post("/forgot-password", authController.forgotPassword);
   * ```
   */
  public async forgotPassword(req: Request, res: Response): Promise<void> {
    const validatedData = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(validatedData.email);

    sendSuccess(res, result, result.message);
  }

  /**
   * Finalizes the password reset using a valid single-use reset token (FR-05, Step 2).
   *
   * Validates input against {@link resetPasswordSchema} and updates the password hash.
   *
   * @param req - The Express request object containing token and new password.
   * @param res - The Express response object.
   * @returns A promise resolving to void.
   * @throws {AppError} 400 `INVALID_TOKEN` if reset token is invalid, expired, or already consumed.
   *
   * @example
   * ```ts
   * authRouter.post("/reset-password", authController.resetPassword);
   * ```
   */
  public async resetPassword(req: Request, res: Response): Promise<void> {
    const validatedData = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(validatedData.token, validatedData.newPassword);

    sendSuccess(res, result, result.message);
  }
}

/**
 * Singleton instance of {@link AuthController} exported for route attachment.
 */
export const authController = new AuthController();
