---
id: "T-008"
title: "Comprehensive Audit Logging & Viewer (NFR-12, R-02, R-06)"
category: "full-stack"
state: "planned"
blocks: []
blocked-by: []
---

## Summary
Ensure all sensitive operations log to AuditLog, and add Admin Audit Log viewer.

## Scope & Changes
- [ ] Create server/src/services/audit.service.ts helper
- [ ] Wire login success/fail, password change/reset, resource/result uploads
- [ ] Route: GET /api/admin/audit-logs with filters
- [ ] Client: Audit Log viewer tab with filters and details modal
- [ ] Tests: unit + integration
