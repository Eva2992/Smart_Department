---
id: "T-012"
title: "Security Hardening & Responsive Polish (NFR-06 to NFR-18)"
category: "full-stack"
state: "planned"
blocks: []
blocked-by: []
---

## Summary
Add helmet, rate-limit, error sanitation, /api alias, responsive mobile menu in Navbar.

## Scope & Changes
- [ ] Add helmet & express-rate-limit in server/src/app.ts
- [ ] Sanitize production errors in errorHandler.ts
- [ ] Alias /api routes alongside /api/v1
- [ ] Add mobile navigation drawer/toggle in Navbar.tsx
- [ ] Verify full responsive breakpoints
