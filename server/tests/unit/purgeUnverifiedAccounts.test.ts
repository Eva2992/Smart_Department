import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  purgeUnverifiedAccounts,
  startPurgeJob,
} from "../../src/jobs/purgeUnverifiedAccounts.job.js";
import { prisma } from "../../src/lib/prisma.js";
import cron from "node-cron";

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    user: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

describe("purgeUnverifiedAccounts Job (FR-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("purges accounts unverified for > 7 days", async () => {
    vi.mocked(prisma.user.deleteMany).mockResolvedValue({ count: 3 } as any);

    const result = await purgeUnverifiedAccounts();

    expect(result.count).toBe(3);
    expect(prisma.user.deleteMany).toHaveBeenCalledTimes(1);

    const callArgs = vi.mocked(prisma.user.deleteMany).mock.calls[0][0];
    expect(callArgs?.where?.isVerified).toBe(false);
    const createdAtFilter = callArgs?.where?.createdAt as any;
    expect(createdAtFilter?.lt).toBeInstanceOf(Date);

    // Verify cutoff is approximately 7 days ago
    const cutoff = createdAtFilter?.lt as Date;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(cutoff.getTime() - sevenDaysAgo)).toBeLessThan(5000);
  });

  it("initializes node-cron job to run daily at midnight", () => {
    const mockTask = { stop: vi.fn() };
    vi.mocked(cron.schedule).mockReturnValue(mockTask as any);

    const task = startPurgeJob();

    expect(cron.schedule).toHaveBeenCalledWith("0 0 * * *", expect.any(Function));
    expect(task).toBe(mockTask);
  });
});
