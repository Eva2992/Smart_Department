---
id: "T-004"
title: "Client React UI for Schedule Grid, Live Conflict Reschedule Modal & Holiday Management"
category: "enhancement"
state: "completed"
blocks: []
blocked-by: ["T-003"]
---

## Summary
Create React frontend components for Interactive Schedule Grid, Live Conflict Validation Reschedule Modal, Class Cancellation Modal, Room Availability Matrix, and Holiday Manager.

## Scope & Changes
- [x] client/src/api/scheduleApi.ts: Axios API client
- [x] client/src/components/ScheduleGrid.tsx: Day/Week timetable with filtering and status tags
- [x] client/src/components/RescheduleModal.tsx: Live conflict badge (🟢/🔴) as inputs change
- [x] client/src/components/CancelModal.tsx: Cancellation confirmation modal
- [x] client/src/components/RoomMatrix.tsx: 8-room availability visualization
- [x] client/src/components/HolidayManager.tsx: Holiday declaration and listing UI
- [x] client/src/App.tsx: Integrated dashboard with role switcher
- [x] Client component test suite in Vitest

## Acceptance Criteria
- [x] Reschedule modal displays real-time conflict badge when selecting conflicting room/time.
- [x] Schedule grid dynamically updates after rescheduling, cancellation, or holiday declaration.
- [x] Frontend tests pass.