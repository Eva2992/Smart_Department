---
id: "T-002"
title: "Token utilities and AuthService with TDD unit tests"
category: "enhancement"
state: "done"
blocks: ["T-003"]
blocked-by: ["T-001"]
---

## Summary
Implement token generation/hashing and AuthService for registration, preloaded roster validation, email verification, login with lockout, and token refresh/revocation.

## Scope & Changes
- [x] Implement \`token.ts\` (Access token, Refresh token, SHA-256 hash, verification tokens)
- [x] Implement \`preloaded.service.ts\` (Student & Teacher roster verification)
- [x] Implement \`auth.service.ts\` (register, verifyEmail, login, refreshTokens, logout, resendVerification)
- [x] Write unit tests with Vitest in \`server/tests/unit/\`

## Acceptance Criteria
- [x] 100% pass on all unit tests for auth services and token utilities.
