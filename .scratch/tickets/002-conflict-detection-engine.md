---
id: "T-002"
title: "conflictService with comprehensive boundary test suite in Vitest"
category: "enhancement"
state: "completed"
blocks: ["T-003"]
blocked-by: ["T-001"]
---

## Summary
Implement conflictService and pure timeUtils to execute 3-way transactional conflict checking (Room, Teacher, Batch) using interval math with full test coverage.

## Scope & Changes
- [x] server/src/utils/timeUtils.ts: Interval overlap math (startA < endB && endA > startB)
- [x] server/src/services/conflictService.ts: Room, Teacher, Batch collision query logic with excludeScheduleEntryId
- [x] server/tests/unit/conflictService.test.ts & timeUtils.test.ts: Vitest unit tests for all 8 overlap permutations

## Acceptance Criteria
- [x] Abutting slots do not conflict.
- [x] Overlapping slots across any of Room, Teacher, Batch return detailed conflict reasons.
- [x] All unit tests pass with Vitest.