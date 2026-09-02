---
id: "T-005"
title: "Unverified Account Purge Cron Job (FR-02)"
category: "backend"
state: "in-progress"
blocks: []
blocked-by: []
---

## Summary
Implement automated purging of accounts unverified for >7 days using node-cron.

## Scope & Changes
- [ ] Create server/src/jobs/purgeUnverifiedAccounts.job.ts
- [ ] Export purgeUnverifiedAccounts() pure function for testing
- [ ] Schedule daily execution at midnight 0 0 * * *
- [ ] Initialize job in server/src/server.ts
- [ ] Add unit test in server/tests/unit/purgeUnverifiedAccounts.test.ts
