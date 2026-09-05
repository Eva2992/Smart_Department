import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

/**
 * Purges inactive accounts that have remained unverified past the 7-day grace period (FR-02, NFR-08).
 *
 * Scans the database for User records where `isVerified: false` and the account registration
 * `createdAt` timestamp is strictly older than 7 days (`7 * 24 * 60 * 60 * 1000` milliseconds ago).
 * Executing this batch deletion frees unverified roster slots, purges stale unverified registrations,
 * and maintains database hygiene.
 *
 * @returns A promise resolving to an object containing the `count` of purged account records.
 * @throws {Error} Thrown if the database query or transaction encounters a connection failure.
 *
 * @example
 * ```ts
 * const { count } = await purgeUnverifiedAccounts();
 * console.log(`Purged ${count} unverified account(s).`);
 * ```
 */
export async function purgeUnverifiedAccounts(): Promise<{ count: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const result = await prisma.user.deleteMany({
      where: {
        isVerified: false,
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    if (result.count > 0) {
      console.log(
        `[Cron: PurgeUnverified] Successfully purged ${result.count} unverified account(s).`
      );
    }

    return result;
  } catch (error) {
    console.error("[Cron: PurgeUnverified] Error purging unverified accounts:", error);
    throw error;
  }
}

/**
 * Schedules and activates the daily unverified account cleanup cron job (FR-02).
 *
 * Configures a recurring `node-cron` schedule executing daily at 00:00 (midnight system local time)
 * using the cron pattern `"0 0 * * *"`. Each invocation delegates to {@link purgeUnverifiedAccounts}
 * within an isolated try-catch block to prevent unhandled background exceptions from crashing the server.
 *
 * @returns The active ScheduledTask instance controlling the scheduled job lifecycle.
 *
 * @example
 * ```ts
 * import { startPurgeJob } from "./jobs/purgeUnverifiedAccounts.job.js";
 *
 * // Initialized during server startup
 * const purgeTask = startPurgeJob();
 * ```
 */
export function startPurgeJob() {
  return cron.schedule("0 0 * * *", async () => {
    console.log("[Cron: PurgeUnverified] Running scheduled cleanup of unverified accounts...");
    try {
      await purgeUnverifiedAccounts();
    } catch (err) {
      console.error("[Cron: PurgeUnverified] Scheduled purge failed:", err);
    }
  });
}
