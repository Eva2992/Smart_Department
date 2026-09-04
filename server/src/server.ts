import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { startPurgeJob } from "./jobs/purgeUnverifiedAccounts.job.js";

/** Active HTTP port number derived from runtime configuration. */
export const PORT = env.PORT;

/**
 * Active Node.js HTTP server instance created by binding the Express application to {@link PORT}.
 *
 * Verifies PostgreSQL database connectivity on startup via a ping query,
 * and launches background scheduled maintenance jobs.
 */
export const server = app.listen(PORT, async () => {
  console.log(`🚀 Smart Department Server running on port ${PORT} [${env.NODE_ENV}]`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`📦 Database connected successfully (PostgreSQL / Neon)`);
  } catch (error) {
    console.error(`❌ Database connection failed:`, error instanceof Error ? error.message : error);
  }

  startPurgeJob();
});

/**
 * Graceful termination handler invoked when operating system signals are received.
 *
 * Stops accepting new HTTP connections via `server.close`, terminates active connections,
 * disconnects the {@link prisma} database client, and exits cleanly with code `0`.
 * Includes a 10-second safety timeout to force exit with code `1` if resources hang.
 *
 * @param signal - The termination signal received from the operating system (e.g. `'SIGINT'`, `'SIGTERM'`).
 * @returns Nothing (`void`).
 *
 * @example
 * ```ts
 * process.on("SIGTERM", () => handleShutdown("SIGTERM"));
 * ```
 */
export function handleShutdown(signal: string): void {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log("🔒 HTTP server closed.");
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
