import { describe, it, expect } from "vitest";
import {
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  generateOtp,
} from "../../src/utils/token.js";
import type { AccessTokenPayload, RefreshTokenPayload } from "../../src/types/auth.js";

describe("Token Utilities (Unit Seam)", () => {
  it("hashToken produces consistent, non-reversible SHA-256 hex string", () => {
    const raw = "sample_raw_refresh_token_12345";
    const hash1 = hashToken(raw);
    const hash2 = hashToken(raw);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    expect(hash1).not.toBe(raw);
  });

  it("generateAccessToken and verifyAccessToken work with valid payload", () => {
    const payload: AccessTokenPayload = {
      userId: "user-123",
      email: "student@juniv.edu",
      role: "STUDENT",
      name: "Test Student",
      universityId: "2021-1-60-001",
      batchId: "batch-1",
      program: "HONOURS",
    };

    const token = generateAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3);

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.name).toBe(payload.name);
  });

  it("generateRefreshToken and verifyRefreshToken work with valid payload", () => {
    const payload: RefreshTokenPayload = {
      userId: "user-456",
    };

    const token = generateRefreshToken(payload);
    expect(typeof token).toBe("string");

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toBe("user-456");
  });

  it("generateVerificationToken creates a random hex token with 24-hour expiration", () => {
    const { token, expiresAt } = generateVerificationToken();

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThanOrEqual(32);

    const now = Date.now();
    const expiry = expiresAt.getTime();
    // Expiration should be roughly 24 hours from now (+/- 10 seconds)
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    expect(expiry - now).toBeGreaterThan(twentyFourHoursMs - 10000);
    expect(expiry - now).toBeLessThanOrEqual(twentyFourHoursMs + 1000);
  });

  it("generateOtp creates a 6-digit numeric string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
  });
});
