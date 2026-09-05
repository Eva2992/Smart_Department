import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AccessTokenPayload, RefreshTokenPayload } from "../types/auth.js";

/**
 * Computes the SHA-256 cryptographic hash digest of a raw token string (NFR-08).
 *
 * Utilizes Node.js standard `crypto.createHash("sha256")` to transform high-entropy raw tokens
 * (such as JWT refresh tokens) into fixed-length 64-character hexadecimal digests prior to database
 * persistence. Storing digests ensures that database exposure does not compromise valid active sessions.
 *
 * @param token - The raw plaintext token string to be hashed.
 * @returns A 64-character hexadecimal SHA-256 hash digest.
 *
 * @example
 * ```ts
 * const rawToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
 * const digest = hashToken(rawToken);
 * console.log(`SHA-256 Digest: ${digest}`);
 * ```
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a signed JSON Web Token (JWT) access token for authenticated API requests (FR-03, NFR-08).
 *
 * Uses the HMAC SHA-256 (`HS256`) symmetric signing algorithm with `env.JWT_ACCESS_SECRET`.
 * Access tokens are short-lived (configured by `env.JWT_ACCESS_EXPIRES_IN`, typically 15 minutes)
 * and encapsulate essential user identity claims (ID, email, name, role, and academic context).
 *
 * @param payload - User identity and authorization claims to encode in the token payload.
 * @returns A signed JWT string formatted as `header.payload.signature`.
 *
 * @example
 * ```ts
 * const token = generateAccessToken({
 *   userId: "usr_101",
 *   email: "student@juniv.edu",
 *   role: "STUDENT",
 *   name: "Sumon Paul",
 *   universityId: "20220654999",
 *   teacherUniqueId: null,
 *   batchId: "batch_52",
 *   program: "BSC_HONOURS",
 *   isChairman: false,
 * });
 * ```
 */
export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Generates a signed JSON Web Token (JWT) refresh token for session lifecycle management (FR-03, NFR-08).
 *
 * Uses HMAC SHA-256 (`HS256`) with `env.JWT_REFRESH_SECRET`.
 * Refresh tokens are long-lived (configured by `env.JWT_REFRESH_EXPIRES_IN`, default 7 days)
 * and contain only minimal subject identifiers (`userId`). The issued token should be transmitted
 * securely to the client and stored in the database as a SHA-256 digest via {@link hashToken}.
 *
 * @param payload - Minimal user identifier payload for session tracking.
 * @returns A signed JWT refresh token string.
 *
 * @example
 * ```ts
 * const refreshToken = generateRefreshToken({ userId: "usr_101" });
 * ```
 */
export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/**
 * Verifies and decodes a signed JWT access token against the configured secret (NFR-08).
 *
 * Validates cryptographic signature using `env.JWT_ACCESS_SECRET` and checks token expiration.
 *
 * @param token - The encoded JWT access token string to verify.
 * @returns The decoded {@link AccessTokenPayload} containing user identity and authorization claims.
 * @throws {jwt.JsonWebTokenError} Thrown if signature verification fails or token structure is invalid.
 * @throws {jwt.TokenExpiredError} Thrown if the access token has exceeded its validity window.
 *
 * @example
 * ```ts
 * try {
 *   const payload = verifyAccessToken(bearerToken);
 *   console.log(`Authenticated as user ${payload.userId}`);
 * } catch (err) {
 *   console.error("Access token verification failed", err);
 * }
 * ```
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Verifies and decodes a signed JWT refresh token against the refresh secret (NFR-08).
 *
 * Validates cryptographic signature using `env.JWT_REFRESH_SECRET` and ensures non-expiration.
 *
 * @param token - The raw JWT refresh token string to verify.
 * @returns The decoded {@link RefreshTokenPayload} containing the subject `userId`.
 * @throws {jwt.JsonWebTokenError} Thrown if the token signature is invalid or malformed.
 * @throws {jwt.TokenExpiredError} Thrown if the refresh token has expired beyond its 7-day lifetime.
 *
 * @example
 * ```ts
 * try {
 *   const { userId } = verifyRefreshToken(incomingRefreshToken);
 *   console.log(`Valid refresh token for user ${userId}`);
 * } catch (err) {
 *   console.error("Invalid or expired refresh token", err);
 * }
 * ```
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

/**
 * Generates a cryptographically secure, random single-use verification token with 24-hour expiration (FR-01, FR-02).
 *
 * Produces 32 bytes (256 bits) of entropy using Node.js standard `crypto.randomBytes(32)`
 * and formats it as a 64-character hexadecimal string.
 * Sets `expiresAt` exactly 24 hours (`24 * 60 * 60 * 1000` ms) into the future.
 *
 * @returns An object containing the raw hexadecimal `token` and its `expiresAt` timestamp.
 *
 * @example
 * ```ts
 * const { token, expiresAt } = generateVerificationToken();
 * console.log(`Token: ${token}, Expires: ${expiresAt.toISOString()}`);
 * ```
 */
export function generateVerificationToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { token, expiresAt };
}

/**
 * Generates a cryptographically secure, random single-use password reset token with 1-hour expiration (FR-05, NFR-08).
 *
 * Produces 32 bytes (256 bits) of high-entropy randomness via `crypto.randomBytes(32)`
 * formatted as a 64-character hexadecimal string.
 * Sets `expiresAt` exactly 1 hour (`60 * 60 * 1000` ms) from creation time to minimize the vulnerability window.
 *
 * @returns An object containing the raw hexadecimal `token` and its 1-hour `expiresAt` timestamp.
 *
 * @example
 * ```ts
 * const { token, expiresAt } = generateResetPasswordToken();
 * console.log(`Reset Token: ${token}, Expires at: ${expiresAt.toISOString()}`);
 * ```
 */
export function generateResetPasswordToken(): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return { token, expiresAt };
}

/**
 * Generates a 6-digit numeric one-time password (OTP) suitable for two-factor verification or SMS/email codes.
 *
 * Produces a pseudo-random integer between 100000 and 999999 inclusive, formatted as a string.
 *
 * @returns A 6-digit numeric string (e.g., `"482910"`).
 *
 * @example
 * ```ts
 * const otp = generateOtp();
 * console.log(`Verification OTP: ${otp}`);
 * ```
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
