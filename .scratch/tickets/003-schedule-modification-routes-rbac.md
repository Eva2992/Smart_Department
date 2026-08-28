---
id: "T-003"
title: "Schedule modification routes with RBAC, routine generation & holiday declarations"
category: "enhancement"
state: "completed"
blocks: ["T-004"]
blocked-by: ["T-002"]
---

## Summary
Implement scheduleService, holidayService, controllers, middleware (auth, RBAC, ownership), and Express routes for class rescheduling, time adjustments, cancellations, room availability, routine generation, and holiday management.

## Scope & Changes
- [x] server/src/middleware/auth.ts and rbac.ts
- [x] server/src/services/scheduleService.ts and holidayService.ts
- [x] server/src/controllers/schedule.controller.ts, holiday.controller.ts, room.controller.ts, routine.controller.ts
- [x] server/src/routes/schedule.routes.ts, holiday.routes.ts, room.routes.ts, routine.routes.ts
- [x] server/tests/unit/scheduleService.test.ts and server/tests/integration/schedule.integration.test.ts

## Acceptance Criteria
- [x] Teachers can only reschedule/cancel their own classes.
- [x] Rescheduling runs conflict validation and rejects clashes with 409 Conflict.
- [x] Cancelling a class frees the slot immediately.
- [x] Declaring a holiday retroactively marks classes on that date as HOLIDAY; deleting it restores them.