import "dotenv/config";
import { z } from "zod";

/**
 * Zod validation schema defining the contract, types, and defaults for all environment variables.
 * Ensures fail-fast validation upon server startup.
 *
 * @example
 * ```ts
 * const customConfig = envSchema.parse(process.env);
 * ```
 */
export const envSchema = z.object({
  /** Runtime execution mode: `'development'`, `'test'`, or `'production'`. Defaults to `'development'`. */
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  /** HTTP listening port for the Express application. Defaults to `5000`. */
  PORT: z.coerce.number().default(5000),

  /** Primary PostgreSQL connection string with connection pooling (e.g. Neon). */
  DATABASE_URL: z
    .string()
    .optional()
    .default("postgresql://postgres:postgres@localhost:5432/smart_department"),

  /** Direct PostgreSQL connection string for Prisma migrations bypassing connection poolers. */
  DIRECT_URL: z.string().optional(),

  /** HMAC secret key used for signing short-lived JWT access tokens. */
  JWT_ACCESS_SECRET: z.string().default("smart_department_default_access_secret_2026"),

  /** HMAC secret key used for signing long-lived JWT refresh tokens. */
  JWT_REFRESH_SECRET: z.string().default("smart_department_default_refresh_secret_2026"),

  /** Expiration lifespan for JWT access tokens (e.g., `'15m'`). */
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),

  /** Expiration lifespan for JWT refresh tokens (e.g., `'7d'`). */
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  /** Allowed CORS origins (comma-separated string or `'*'` for unrestricted access). */
  CORS_ORIGIN: z.string().default("*"),

  /** Canonical client frontend application URL for password reset redirections and links. */
  CLIENT_URL: z.string().default("http://localhost:5173"),

  /** Optional API key for SendGrid transactional email delivery in production. */
  SENDGRID_API_KEY: z.string().optional(),

  /** Sender email address used for outbound system notifications and verification emails. */
  SENDGRID_FROM: z.string().default("20220654963nirob@juniv.edu"),
});

/**
 * Inferred TypeScript type representing the validated runtime configuration object of the application.
 *
 * @example
 * ```ts
 * function configureServer(config: Env) {
 *   console.log(config.PORT);
 * }
 * ```
 */
export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

/**
 * Validated, immutable runtime environment configuration object for the Smart Department platform.
 *
 * Extracted from `process.env` and validated against {@link envSchema}. If validation fails,
 * execution halts immediately with status code `1` to prevent booting in an inconsistent state.
 *
 * @example
 * ```ts
 * import { env } from "./config/env.js";
 * console.log(`Server starting on port ${env.PORT} in ${env.NODE_ENV} mode`);
 * ```
 */
export const env: Env = parsedEnv.data;
