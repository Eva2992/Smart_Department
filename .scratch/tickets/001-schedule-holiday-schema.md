---
id: "T-001"
title: "ClassSchedule and Holiday schema + indexed queries + seed data"
category: "enhancement"
state: "completed"
blocks: ["T-002", "T-003"]
blocked-by: []
---

## Summary
Ensure the Prisma schema and database seed have complete data for Batches, Teachers, Courses, 8 Fixed Rooms, Schedule Entries, and Holidays to support conflict detection and day-wise scheduling.

## Scope & Changes
- [x] Prisma schema verified for ScheduleEntry, Holiday, Room, Course, Batch, User
- [x] Indexed queries for (roomId, date), (teacherId, date), (batchId, date), (date)
- [x] Seed script updated with realistic JU CSE test data (teachers, batches, rooms, initial routine slots, holidays)

## Acceptance Criteria
- [x] prisma/seed.ts successfully seeds 8 fixed rooms, demo teachers, demo batches (51st, 52nd), demo courses, and schedule entries.