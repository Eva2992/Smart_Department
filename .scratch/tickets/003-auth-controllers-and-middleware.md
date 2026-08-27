---
id: "T-003"
title: "Auth controllers, Zod validation, middleware, and integration tests"
category: "enhancement"
state: "done"
blocks: ["T-004"]
blocked-by: ["T-002"]
---

## Summary
Implement Express auth router, controllers, Zod schemas, auth middleware (JWT authentication + RBAC role guards), and integration tests.

## Scope & Changes
- [x] Zod validators in \`server/src/validators/auth.validator.ts\`
- [x] Auth middleware in \`server/src/middleware/auth.ts\`
- [x] Controller in \`server/src/controllers/auth.controller.ts\`
- [x] Routes mounted at \`/api/v1/auth\`
- [x] Integration tests in \`server/tests/integration/auth.test.ts\`

## Acceptance Criteria
- [x] All integration tests pass via Supertest.
- [x] Correct HTTP status codes and error envelopes.
