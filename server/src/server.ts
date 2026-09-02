import { app } from "./app.js";
import { env } from "./config/env.js";
import { startPurgeJob } from "./jobs/purgeUnverifiedAccounts.job.js";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`🚀 Smart Schedular Server running on port ${PORT} [${env.NODE_ENV}]`);
  startPurgeJob();
});

// Graceful shutdown handling
function handleShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log("🔒 HTTP server closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
