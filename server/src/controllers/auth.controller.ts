import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  refreshTokenSchema,
  resendVerificationSchema,
} from "../validators/auth.validator.js";
import { sendSuccess, sendCreated } from "../utils/response.js";
import { AppError } from "../middleware/errorHandler.js";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const validatedData = registerSchema.parse(req.body);
    const result = await authService.register(validatedData);

    sendCreated(
      res,
      result,
      "Registration successful! Please check your email to activate your account."
    );
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    const token = req.params.token || req.body.token || (req.query.token as string);

    if (!token) {
      throw new AppError("Verification token is required", 400, "INVALID_TOKEN");
    }

    const validated = verifyEmailSchema.parse({ token });
    const result = await authService.verifyEmail(validated.token);

    sendSuccess(res, result.user, result.message);
  }

  async login(req: Request, res: Response): Promise<void> {
    const validatedData = loginSchema.parse(req.body);
    const result = await authService.login(validatedData);

    sendSuccess(res, result, "Login successful");
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const validatedData = refreshTokenSchema.parse(req.body);
    const tokens = await authService.refreshTokens(validatedData.refreshToken);

    sendSuccess(res, tokens, "Tokens refreshed successfully");
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.body?.refreshToken;
    const userId = req.user?.userId;

    await authService.logout(refreshToken, userId);
    sendSuccess(res, { success: true }, "Logged out successfully");
  }

  async resendVerification(req: Request, res: Response): Promise<void> {
    const validatedData = resendVerificationSchema.parse(req.body);
    const result = await authService.resendVerificationEmail(validatedData.email);

    sendSuccess(res, result, result.message);
  }

  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user?.userId) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }

    const user = await authService.getMe(req.user.userId);
    sendSuccess(res, user, "User profile retrieved successfully");
  }
}

export const authController = new AuthController();
