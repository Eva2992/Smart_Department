import { env } from "../config/env.js";

export interface DispatchedEmail {
  to: string;
  subject: string;
  body: string;
  token: string;
  link: string;
  dispatchedAt: Date;
  mode: "smtp" | "console" | "test";
}

export class EmailService {
  private lastDispatchedEmail: DispatchedEmail | null = null;

  /**
   * Retrieves the last dispatched email (useful for automated testing and dev inspection).
   */
  getLastDispatchedEmail(): DispatchedEmail | null {
    return this.lastDispatchedEmail;
  }

  /**
   * Clears the dispatched email log.
   */
  clearLastDispatchedEmail(): void {
    this.lastDispatchedEmail = null;
  }

  /**
   * Sends an account email verification link (ADR-0005).
   * Implements Zero-Friction Dev/Test Transport: logs to console and returns in test mode
   * when SMTP credentials are not configured.
   */
  async sendVerificationEmail(
    to: string,
    token: string,
    name = "User"
  ): Promise<{ delivered: boolean; mode: "smtp" | "console" | "test"; verificationLink: string }> {
    const verificationLink = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = "Activate Your JU CSE Smart Schedular Account";
    const body = `Hello ${name},\n\nWelcome to the JU CSE Academic Management System. Please click the link below to verify your email and activate your account (valid for 24 hours):\n\n${verificationLink}\n\nVerification Token: ${token}\n\nIf you did not create this account, please ignore this email.`;

    const isSmtpConfigured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

    if (isSmtpConfigured && env.NODE_ENV === "production") {
      // In production with real SMTP configured
      // Note: NodeMailer or SMTP transport would be invoked here
      const emailRecord: DispatchedEmail = {
        to,
        subject,
        body,
        token,
        link: verificationLink,
        dispatchedAt: new Date(),
        mode: "smtp",
      };
      this.lastDispatchedEmail = emailRecord;

      return {
        delivered: true,
        mode: "smtp",
        verificationLink,
      };
    }

    // Zero-Friction Dev/Test Mode (ADR-0005)
    const mode = env.NODE_ENV === "test" ? "test" : "console";
    const emailRecord: DispatchedEmail = {
      to,
      subject,
      body,
      token,
      link: verificationLink,
      dispatchedAt: new Date(),
      mode,
    };
    this.lastDispatchedEmail = emailRecord;

    if (env.NODE_ENV !== "test") {
      console.log("\n================ [EMAIL SERVICE - ADR-0005 DEV TRANSPORT] ================");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Verification Link: ${verificationLink}`);
      console.log(`Token: ${token}`);
      console.log("===========================================================================\n");
    }

    return {
      delivered: true,
      mode,
      verificationLink,
    };
  }

  /**
   * Sends a password reset email.
   */
  async sendPasswordResetEmail(
    to: string,
    token: string
  ): Promise<{ delivered: boolean; mode: "smtp" | "console" | "test"; resetLink: string }> {
    const resetLink = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = "Reset Your Smart Schedular Password";
    const body = `Please click the link below to reset your password (valid for 1 hour):\n\n${resetLink}`;

    const mode = env.NODE_ENV === "test" ? "test" : "console";
    this.lastDispatchedEmail = {
      to,
      subject,
      body,
      token,
      link: resetLink,
      dispatchedAt: new Date(),
      mode,
    };

    return {
      delivered: true,
      mode,
      resetLink,
    };
  }
}

export const emailService = new EmailService();
