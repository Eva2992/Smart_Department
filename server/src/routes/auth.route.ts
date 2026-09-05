import { Router } from "express";
import { authController, type AuthController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

/**
 * Express router handling authentication and identity management endpoints.
 *
 * Implements user registration, credential authentication, session refresh,
 * logout, and password recovery workflows per SRS requirements:
 * - `FR-01` & `AN-01`/`AN-02`: Student & Teacher account registration verified against preloaded roster.
 * - `FR-03`: Multi-role login supporting Student, Teacher, CR, Chairman, and Admin roles.
 * - `FR-04`: Authenticated password updates with current password verification.
 * - `FR-05`: Self-service password reset with short-lived tokens.
 * - `NFR-08`: Token security via dual-token JWT architecture (access + refresh tokens).
 * - `NFR-10`: Rate limiting applied at the application layer via `authLimiter`.
 *
 * Route Table:
 * - `POST /register`: Register user via preloaded roster verification (delegates to {@link authController.register}).
 * - `POST /login`: Authenticate credentials and return JWT tokens (delegates to {@link authController.login}).
 * - `POST /refresh`: Renew expired access token using refresh token (delegates to {@link authController.refresh}).
 * - `POST /logout`: Invalidate refresh token and session (delegates to {@link authController.logout}).
 * - `GET /me`: Fetch authenticated user profile (protected by {@link authenticate}, delegates to {@link authController.getMe}).
 * - `POST /change-password`: Update password for authenticated user (protected by {@link authenticate}, delegates to {@link authController.changePassword}).
 * - `POST /forgot-password`: Request password reset token (delegates to {@link authController.forgotPassword}).
 * - `POST /reset-password`: Reset password using token (delegates to {@link authController.resetPassword}).
 *
 * @see {@link AuthController}
 * @see {@link authenticate}
 *
 * @example
 * ```ts
 * import { authRouter } from "./routes/auth.route.js";
 * app.use("/api/v1/auth", authRouter);
 * ```
 */
const authRouter = Router();

authRouter.post("/register", (req, res, next) => {
  authController.register(req, res).catch(next);
});

authRouter.post("/login", (req, res, next) => {
  authController.login(req, res).catch(next);
});

authRouter.post("/refresh", (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

authRouter.post("/logout", (req, res, next) => {
  authController.logout(req, res).catch(next);
});

authRouter.get("/me", authenticate, (req, res, next) => {
  authController.getMe(req, res).catch(next);
});

// Password Management (FR-04, FR-05)
authRouter.post("/change-password", authenticate, (req, res, next) => {
  authController.changePassword(req, res).catch(next);
});

authRouter.post("/forgot-password", (req, res, next) => {
  authController.forgotPassword(req, res).catch(next);
});

authRouter.post("/reset-password", (req, res, next) => {
  authController.resetPassword(req, res).catch(next);
});

export { authRouter };
