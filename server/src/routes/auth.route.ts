import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";

const authRouter = Router();

authRouter.post("/register", (req, res, next) => {
  authController.register(req, res).catch(next);
});

authRouter.post("/login", (req, res, next) => {
  authController.login(req, res).catch(next);
});

authRouter.post("/verify-email", (req, res, next) => {
  authController.verifyEmail(req, res).catch(next);
});

authRouter.get("/verify-email/:token", (req, res, next) => {
  authController.verifyEmail(req, res).catch(next);
});

authRouter.post("/refresh", (req, res, next) => {
  authController.refresh(req, res).catch(next);
});

authRouter.post("/logout", (req, res, next) => {
  authController.logout(req, res).catch(next);
});

authRouter.post("/resend-verification", (req, res, next) => {
  authController.resendVerification(req, res).catch(next);
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
