---
id: "T-007"
title: "CR Role Management & Single CR Constraint (AN-10, C-05)"
category: "full-stack"
state: "planned"
blocks: []
blocked-by: []
---

## Summary
Admin can promote student to CR or demote CR to student with C-05 constraint enforcement.

## Scope & Changes
- [ ] Add updateUserRole in server/src/services/student.service.ts
- [ ] Route: PATCH /api/admin/users/:id/role
- [ ] Enforce single active CR per batch constraint
- [ ] Client: Promote/Demote buttons and modal in student list
- [ ] Tests: unit + integration
