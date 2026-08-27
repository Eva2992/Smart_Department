---
id: "T-001"
title: "Prisma schema and seed for Auth-1 module"
category: "enhancement"
state: "done"
blocks: ["T-002"]
blocked-by: []
---

## Summary
Update Prisma schema to support email verification tokens, and seed preloaded roster data (students & teachers) along with academic batches and rooms.

## Scope & Changes
- [x] Add \`verificationToken\` and \`verificationTokenExpiry\` to \`User\` in \`server/prisma/schema.prisma\`
- [x] Run \`npx prisma generate\` and \`npx prisma validate\`
- [x] Update \`server/prisma/seed.ts\` with sample batches, preloaded students, and preloaded teachers

## Acceptance Criteria
- [x] Prisma schema is valid and generated without errors.
- [x] Seed script includes preloaded test rosters for JU CSE.
