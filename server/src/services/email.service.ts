import sgMail from "@sendgrid/mail";
import { env } from "../config/env.js";

/**
 * Represents a structured record of an email dispatched by {@link EmailService}.
 *
 * Captures email delivery metadata and rendered message payloads for development inspection,
 * auditing, and automated testing assertions without requiring real outbound SMTP connections.
 */
export interface DispatchedEmail {
  /** The recipient's institutional email address. */
  to: string;
  /** The subject line header of the email message. */
  subject: string;
  /** The rendered plain-text fallback version of the email message body. */
  body: string;
  /** The raw cryptographic token string embedded within the action URL and message body. */
  token: string;
  /** The complete, clickable action URL pointing to the client frontend (e.g. email verification or password reset). */
  link: string;
  /** Timestamp recording when the dispatch operation was executed. */
  dispatchedAt: Date;
  /**
   * The transport mechanism utilized for dispatch:
   * - `"sendgrid"`: Real outbound delivery via the SendGrid API.
   * - `"console"`: Local development fallback printing formatted email contents to stdout.
   * - `"test"`: In-memory capture for Vitest integration tests without external I/O.
   */
  mode: "sendgrid" | "console" | "test";
}

/**
 * Transactional Email Dispatch and Notification Service (FR-02, FR-05, ADR-0005).
 *
 * Implements an adapter pattern providing zero-friction email transport across development,
 * testing, and production environments:
 * 1. **Testing Mode (`NODE_ENV === "test"`)**: Captures outbound message payloads in memory
 *    via {@link getLastDispatchedEmail} without performing external HTTP network requests, enabling fast,
 *    deterministic integration tests.
 * 2. **Production Mode (`SENDGRID_API_KEY` configured)**: Dispatches branded HTML and plain-text emails
 *    using the `@sendgrid/mail` SMTP API gateway.
 * 3. **Development Console Fallback (Unset API key in development)**: Emits formatted email summaries
 *    with active links and tokens directly to the server terminal console (`stdout`).
 *
 * Email templates adhere to the department design identity, featuring the official JU CSE Crimson branding
 * (`#DC143C`) and security notices emphasizing token expiration windows and confidential credentials handling.
 *
 * @example
 * ```ts
 * const result = await emailService.sendPasswordResetEmail(
 *   "student@juniv.edu",
 *   "e4a8b2c1d3f567890abcdef123456789"
 * );
 * console.log(`Dispatched via: ${result.mode}, Link: ${result.resetLink}`);
 * ```
 */
export class EmailService {
  private lastDispatchedEmail: DispatchedEmail | null = null;

  /**
   * Initializes the email service instance and sets up the SendGrid API client
   * if `env.SENDGRID_API_KEY` is present.
   */
  constructor() {
    if (env.SENDGRID_API_KEY) {
      sgMail.setApiKey(env.SENDGRID_API_KEY);
    }
  }

  /**
   * Retrieves the most recently dispatched email record from in-memory storage.
   *
   * Primarily utilized in automated integration tests and local debugging to assert
   * that correct token parameters and recipient headers were constructed during auth workflows.
   *
   * @returns The last {@link DispatchedEmail} recorded, or `null` if no emails have been sent or after clearance.
   *
   * @example
   * ```ts
   * const sent = emailService.getLastDispatchedEmail();
   * expect(sent?.to).toBe("user@juniv.edu");
   * expect(sent?.token).toBeDefined();
   * ```
   */
  getLastDispatchedEmail(): DispatchedEmail | null {
    return this.lastDispatchedEmail;
  }

  /**
   * Clears the in-memory record of the last dispatched email.
   *
   * Call between test cases to ensure test isolation.
   *
   * @example
   * ```ts
   * emailService.clearLastDispatchedEmail();
   * expect(emailService.getLastDispatchedEmail()).toBeNull();
   * ```
   */
  clearLastDispatchedEmail(): void {
    this.lastDispatchedEmail = null;
  }

  /**
   * Sends an account email verification link to complete student or faculty registration (FR-01, FR-02).
   *
   * Generates a 24-hour expiring activation link pointing to `${CLIENT_URL}/verify-email`.
   * Renders a responsive HTML message using JU CSE brand colors (`#DC143C`) alongside a plain-text alternative.
   *
   * Routing behavior:
   * - In `test` environment: stores dispatch details in memory without outbound network calls.
   * - In production with `SENDGRID_API_KEY`: dispatches via SendGrid API.
   * - In development without API key: logs the verification link and token to the terminal.
   *
   * @param to - The recipient's institutional email address.
   * @param token - The 24-hour cryptographically secure random activation token.
   * @param name - The recipient's display name for personalizing the greeting (defaults to `"User"`).
   * @returns An object containing the delivery boolean flag, the active transport `mode`, and the constructed `verificationLink`.
   * @throws {Error} Thrown if SendGrid API delivery fails in production.
   *
   * @example
   * ```ts
   * const dispatch = await emailService.sendVerificationEmail(
   *   "student@juniv.edu",
   *   "token_abc123",
   *   "Sumon Paul"
   * );
   * console.log(`Verification URL: ${dispatch.verificationLink}`);
   * ```
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
   * Dispatches a self-service password reset email containing a time-limited reset link (FR-05, NFR-08).
   *
   * Formats a branded HTML email adhering to the JU CSE departmental color scheme (`#DC143C`)
   * and plain-text alternative. Embeds an actionable link pointing to `${CLIENT_URL}/reset-password?token=${token}`.
   *
   * Security Invariants & Lifetimes:
   * - Reset tokens are cryptographically random 32-byte hexadecimal strings generated for single-use verification.
   * - Token lifetime is strictly limited to 1 hour (`60 * 60 * 1000` ms) from generation time.
   * - The email body displays prominent security notices discouraging credential sharing.
   * - Consumed or expired tokens cannot be reused; a successful reset revokes all concurrent user sessions (NFR-08).
   *
   * Transport Adapters (ADR-0005):
   * 1. **Testing (`NODE_ENV === "test"`)**: Captures delivery metadata in {@link getLastDispatchedEmail} without network activity.
   * 2. **Production (`env.SENDGRID_API_KEY`)**: Delivers email through SendGrid API (`@sendgrid/mail`).
   * 3. **Development Console Fallback**: Logs destination address, token, and clickable reset URL to stdout.
   *
   * @param to - The recipient's institutional email address.
   * @param token - The cryptographically secure 1-hour single-use reset token.
   * @returns A promise resolving to an object containing delivery status (`delivered: true`), the transport `mode` (`"sendgrid" | "console" | "test"`), and the full `resetLink`.
   * @throws {Error} Thrown if outbound delivery via SendGrid API fails in production.
   *
   * @example
   * ```ts
   * const dispatch = await emailService.sendPasswordResetEmail(
   *   "student@juniv.edu",
   *   "9f83ab2c4e..."
   * );
   * console.log(`Reset email sent via ${dispatch.mode}. Reset Link: ${dispatch.resetLink}`);
   * ```
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

/**
 * Singleton instance of {@link EmailService} exported for system-wide transactional email operations.
 */
export const emailService = new EmailService();
