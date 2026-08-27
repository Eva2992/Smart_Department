import { describe, it, expect, beforeEach } from "vitest";
import { emailService } from "../../src/services/email.service.js";

describe("EmailService (ADR-0005 Zero-Friction Dev/Test Transport)", () => {
  beforeEach(() => {
    emailService.clearLastDispatchedEmail();
  });

  it("sendVerificationEmail generates valid verification link and stores dispatched record in test mode", async () => {
    const result = await emailService.sendVerificationEmail(
      "student@juniv.edu",
      "test-verification-token-12345",
      "Tahmid"
    );

    expect(result.delivered).toBe(true);
    expect(result.mode).toBe("test");
    expect(result.verificationLink).toContain("/verify-email?token=test-verification-token-12345");

    const lastEmail = emailService.getLastDispatchedEmail();
    expect(lastEmail).not.toBeNull();
    expect(lastEmail?.to).toBe("student@juniv.edu");
    expect(lastEmail?.subject).toContain("Activate Your JU CSE");
    expect(lastEmail?.token).toBe("test-verification-token-12345");
  });

  it("sendPasswordResetEmail generates password reset link in test mode", async () => {
    const result = await emailService.sendPasswordResetEmail(
      "faculty@juniv.edu",
      "reset-token-999"
    );

    expect(result.delivered).toBe(true);
    expect(result.resetLink).toContain("/reset-password?token=reset-token-999");
  });
});
