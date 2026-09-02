---
id: "T-010"
title: "CT Marks Aggregation & Class Statistics (FR-27, ADR-0005)"
category: "full-stack"
state: "planned"
blocks: []
blocked-by: []
---

## Summary
Display student CT marks with "Pending" state and class statistics.

## Scope & Changes
- [ ] Enhance ct.service.ts listStudentCTMarks to include stats (avg, high, low, total)
- [ ] Create client/src/components/assessments/CTMarksViewer.tsx
- [ ] Embed into DashboardPage and AssessmentsPage
- [ ] Tests: unit + component tests
