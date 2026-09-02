---
id: "T-009"
title: "Assignment Submission Dual-Mode (FR-21, ADR-0005)"
category: "full-stack"
state: "planned"
blocks: []
blocked-by: []
---

## Summary
Support URL and direct file attachments for student assignment submissions.

## Scope & Changes
- [ ] Add AssignmentSubmission model to Prisma schema
- [ ] Add submitAssignment and getSubmissions to server/src/services/assignment.service.ts
- [ ] Add routes POST/GET /api/assignments/:id/submissions
- [ ] Client: Student submit modal and Teacher submissions list view
- [ ] Tests: unit + integration
