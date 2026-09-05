# 6. Retire Email Verification and Streamline Preloaded Roster Authentication

Date: 2026-09-02

## Status
Accepted (Supersedes verification token flow in ADR-0005)

## Context
Previously, user registration required a two-step activation sequence: account creation generated a verification token and dispatched an email with a 24-hour expiry, requiring users to navigate to `/verify-email` before logging in. Furthermore, teachers had to memorize and provide an arbitrary `teacherUniqueId`, and students had to manually select `Program` and `Batch` alongside their University ID and email. Additionally, public Admin registration was exposed on the registration form.

This created unnecessary onboarding friction, frequent roster mismatch errors, and confusion during local deployment and testing.

## Decision
1. **Retire Email Verification**: Accounts are immediately active (`isVerified: true`) upon successful registration. Registration immediately issues JWT access and refresh tokens, auto-logging the user in. The `/verify-email` route, controller, tokens, and email dispatch are removed from frontend and backend.
2. **Streamline Roster Verification**:
   - **Students**: Identify by University ID (e.g., `20220654955`) and institutional email. On submission, the system verifies the provided email matches the Admin-preloaded roster. `Batch` and `Program` are automatically derived and bound from the authoritative roster without requiring manual form input.
   - **Teachers**: Identify and verify solely by institutional email against the Admin-preloaded faculty roster. The `teacherUniqueId` requirement is removed from registration.
3. **Remove Public Admin Registration**: Admin role registration is removed from the UI and API validation schema. Administrative accounts are seeded via `prisma/seed.ts`.
4. **Simplified Password Policy**: Password complexity regex requirements are replaced with a single minimum length requirement (at least 8 characters), confirmed via "Enter Password" and "Confirm Password" fields.
5. **Secure, User-Friendly Error Presentation**: Internal database/Prisma errors are masked safely on the server, returning clean, actionable error messages displayed directly above form submit buttons.

## Consequences
- Single-step, immediate onboarding for students and faculty.
- Eliminates verification token expirations and email delivery dependencies during account creation.
- Preloaded roster matching ensures only authorized students and faculty can create accounts while keeping the form input minimal and error-free.
