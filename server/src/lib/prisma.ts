import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

/**
 * PostgreSQL connection string retrieved from application runtime configuration.
 */
const connectionString = env.DATABASE_URL;

/**
 * Prisma PostgreSQL adapter utilizing `pg` driver pooling (compatible with Neon and hosted PostgreSQL).
 */
const adapter = new PrismaPg({ connectionString });

/**
 * Shared singleton instance of `PrismaClient` used across all repositories and domain services.
 *
 * Configured with the PostgreSQL adapter for serverless/pooled database connections.
 * Query logging is dynamically tuned to runtime mode:
 * - `development`: Emits `query`, `warn`, and `error` events to assist local debugging.
 * - `production` / `test`: Emits only `error` events to prevent log noise and sensitive data leakage.
 *
 * @example
 * ```ts
 * import { prisma } from "../lib/prisma.js";
 *
 * const activeUsers = await prisma.user.findMany({
 *   where: { role: "STUDENT" },
 * });
 * ```
 */
export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});
