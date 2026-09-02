import sgMail from "@sendgrid/mail";
import { env } from "../config/env.js";

export interface DispatchedEmail {
  to: string;
  subject: string;
  body: string;
  token: string;
  link: string;
  dispatchedAt: Date;
  mode: "sendgrid" | "console" | "test";
}

export class EmailService {
  private lastDispatchedEmail: DispatchedEmail | null = null;

  constructor() {
    if (env.SENDGRID_API_KEY) {
      sgMail.setApiKey(env.SENDGRID_API_KEY);
    }
  }

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
   * Sends an account email verification link.
   * Uses SendGrid when SENDGRID_API_KEY is configured.
   * In test environment, records the dispatch without outbound network requests.
   * If SENDGRID_API_KEY is unset in development, falls back to console logging.
   */
  async sendVerificationEmail(
    to: string,
    token: string,
    name = "User"
  ): Promise<{ delivered: boolean; mode: "sendgrid" | "console" | "test"; verificationLink: string }> {
    const verificationLink = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = "Activate Your JU CSE Smart Department Account";
    const textBody = `Hello ${name},\n\nWelcome to the JU CSE Academic Management System. Please click the link below to verify your email and activate your account (valid for 24 hours):\n\n${verificationLink}\n\nVerification Token: ${token}\n\nIf you did not create this account, please ignore this email.`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #DC143C; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">JU CSE Smart Department</h2>
        </div>
        <div style="padding: 24px;">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Welcome to the JU CSE Academic Management System. Please verify your email address to activate your account:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verificationLink}" style="background-color: #DC143C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size: 13px; color: #6b7280;">This link will expire in 24 hours. If the button above does not work, copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #DC143C; word-break: break-all;">${verificationLink}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">If you did not create an account on JU CSE Smart Department, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    // 1. Test Mode: Store record without sending external HTTP requests
    if (env.NODE_ENV === "test") {
      const emailRecord: DispatchedEmail = {
        to,
        subject,
        body: textBody,
        token,
        link: verificationLink,
        dispatchedAt: new Date(),
        mode: "test",
      };
      this.lastDispatchedEmail = emailRecord;

      return {
        delivered: true,
        mode: "test",
        verificationLink,
      };
    }

    // 2. Real SendGrid Delivery
    if (env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to,
          from: env.SENDGRID_FROM,
          subject,
          text: textBody,
          html: htmlBody,
        });

        const emailRecord: DispatchedEmail = {
          to,
          subject,
          body: textBody,
          token,
          link: verificationLink,
          dispatchedAt: new Date(),
          mode: "sendgrid",
        };
        this.lastDispatchedEmail = emailRecord;

        return {
          delivered: true,
          mode: "sendgrid",
          verificationLink,
        };
      } catch (error) {
        console.error("❌ SendGrid Email Delivery Failed:", error);
        throw error;
      }
    }

    // 3. Fallback Dev Transport (Console)
    const emailRecord: DispatchedEmail = {
      to,
      subject,
      body: textBody,
      token,
      link: verificationLink,
      dispatchedAt: new Date(),
      mode: "console",
    };
    this.lastDispatchedEmail = emailRecord;

    console.log("\n================ [EMAIL SERVICE - CONSOLE FALLBACK] ================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Verification Link: ${verificationLink}`);
    console.log(`Token: ${token}`);
    console.log("====================================================================\n");

    return {
      delivered: true,
      mode: "console",
      verificationLink,
    };
  }

  /**
   * Sends a password reset email using SendGrid.
   */
  async sendPasswordResetEmail(
    to: string,
    token: string
  ): Promise<{ delivered: boolean; mode: "sendgrid" | "console" | "test"; resetLink: string }> {
    const resetLink = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
    const subject = "Reset Your Smart Department Password";
    const textBody = `Please click the link below to reset your password (valid for 1 hour):\n\n${resetLink}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #DC143C; color: #ffffff; padding: 20px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">JU CSE Smart Department</h2>
        </div>
        <div style="padding: 24px;">
          <p>Hello,</p>
          <p>You recently requested to reset your password for JU CSE Smart Department. Click the button below to proceed:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetLink}" style="background-color: #DC143C; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 13px; color: #6b7280;">This password reset link is valid for 1 hour. If you did not request a password reset, please ignore this email.</p>
          <p style="font-size: 12px; color: #DC143C; word-break: break-all;">${resetLink}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Security Notice: Never share this link or token with anyone.</p>
        </div>
      </div>
    `;

    // 1. Test Mode: Store record without sending external HTTP requests
    if (env.NODE_ENV === "test") {
      const emailRecord: DispatchedEmail = {
        to,
        subject,
        body: textBody,
        token,
        link: resetLink,
        dispatchedAt: new Date(),
        mode: "test",
      };
      this.lastDispatchedEmail = emailRecord;

      return {
        delivered: true,
        mode: "test",
        resetLink,
      };
    }

    // 2. Real SendGrid Delivery
    if (env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to,
          from: env.SENDGRID_FROM,
          subject,
          text: textBody,
          html: htmlBody,
        });

        const emailRecord: DispatchedEmail = {
          to,
          subject,
          body: textBody,
          token,
          link: resetLink,
          dispatchedAt: new Date(),
          mode: "sendgrid",
        };
        this.lastDispatchedEmail = emailRecord;

        return {
          delivered: true,
          mode: "sendgrid",
          resetLink,
        };
      } catch (error) {
        console.error("❌ SendGrid Email Delivery Failed:", error);
        throw error;
      }
    }

    // 3. Fallback Dev Transport (Console)
    this.lastDispatchedEmail = {
      to,
      subject,
      body: textBody,
      token,
      link: resetLink,
      dispatchedAt: new Date(),
      mode: "console",
    };

    console.log("\n================ [EMAIL SERVICE - PASSWORD RESET (CONSOLE)] ================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset Link: ${resetLink}`);
    console.log(`Token: ${token}`);
    console.log("============================================================================\n");

    return {
      delivered: true,
      mode: "console",
      resetLink,
    };
  }
}

export const emailService = new EmailService();
