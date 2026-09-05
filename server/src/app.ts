import path from "node:path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { apiV1Router } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

/**
 * Pre-configured Express application instance for the Smart Department platform.
 *
 * Assembles the core HTTP middleware pipeline:
 * - Security HTTP headers via Helmet (NFR-09, NFR-11).
 * - CORS origin authorization supporting client-credentialed requests.
 * - JSON and URL-encoded body parsing up to 10MB payload size.
 * - Rate-limited authentication endpoints via {@link authLimiter} (NFR-10).
 * - Static file serving for academic uploads under `/uploads`.
 * - Dual API route mounting on `/api/v1` and `/api` via `apiV1Router`.
 * - Catch-all 404 route handling via {@link notFoundHandler}.
 * - Global centralized error formatting via {@link errorHandler}.
 *
 * @example
 * ```ts
 * import { app } from "./app.js";
 *
 * const server = app.listen(5000, () => {
 *   console.log("Smart Department listening on port 5000");
 * });
 * ```
 */
export const app = express();

// Security HTTP headers (NFR-09, NFR-11)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * Rate limiting middleware applied to sensitive authentication routes (NFR-10).
 *
 * Limits incoming requests to 100 per 15-minute sliding window to mitigate brute-force
 * and denial-of-service attempts. Bypassed automatically when running in the `'test'` environment.
 *
 * @example
 * ```ts
 * router.use("/auth", authLimiter);
 * ```
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test",
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication requests, please try again after 15 minutes.",
    },
  },
});

app.use("/api/v1/auth", authLimiter);
app.use("/api/auth", authLimiter);

// Static file serving for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Dual API route mounting: standard /api/v1 and alias /api
app.use("/api/v1", apiV1Router);
app.use("/api", apiV1Router);

// Catch-all 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);
