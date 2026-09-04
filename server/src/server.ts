import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./lib/prisma.js";
import { startPurgeJob } from "./jobs/purgeUnverifiedAccounts.job.js";

const PORT = env.PORT;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Smart Department Server running on port ${PORT} [${env.NODE_ENV}]`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log(`📦 Database connected successfully (PostgreSQL / Neon)`);
  } catch (error) {
    console.error(`❌ Database connection failed:`, error instanceof Error ? error.message : error);
  }

  startPurgeJob();
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
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
