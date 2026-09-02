---
id: "T-011"
title: "Class Count Tracking (SN-05, TN-10)"
category: "full-stack"
state: "planned"
blocks: []
blocked-by: []
---

## Summary
Track total classes conducted per course per teacher (student) and per batch (teacher).

## Scope & Changes
- [ ] Add getClassCounts to server/src/services/scheduleService.ts
- [ ] Add route GET /api/schedules/class-count
- [ ] Client: ClassCountWidget component on DashboardPage
- [ ] Tests: unit + integration
