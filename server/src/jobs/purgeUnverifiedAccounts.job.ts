import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

/**
 * Purges accounts that have remained unverified for longer than 7 days (FR-02).
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
 * Registers the unverified account cleanup cron job.
 * Executes daily at 00:00 (midnight).
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
