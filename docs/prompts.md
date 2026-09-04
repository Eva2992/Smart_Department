# Sprint 1 Engineering Prompts (Matt Pocock Skills Suite)

This document contains standardized, copy-pasteable autonomous agent prompts for **Sprint 1** of the **Smart_Schedular (JU CSE Academic Management System)** project.

Each prompt is structured for the **Matt Pocock Engineering Skills Suite** workflow:

```
/grill-with-docs → /to-spec → /to-tickets → /implement (with /tdd) → /code-review
```

---

## 🛡️ Continuous Integration (CI) Quality Gates

On every push and pull request, the CI pipeline enforces strict verification:

1. **Install Dependencies**: `npm ci` across root, `server/`, and `client/`.
2. **Format Check**: `npx prettier --check .` to catch unformatted code.
3. **Type Check**: `tsc --noEmit` / `npm run typecheck` (TypeScript strict mode in both `server/` and `client/`).
4. **Automated Testing Suite**:
   - Backend unit tests via Vitest.
   - Backend integration tests via Supertest against an isolated PostgreSQL service container.
   - Frontend unit and component integration tests via Vitest and React Testing Library.
5. **Quality Gate Rule**: If any check fails, the pull request is **strictly blocked from merging** until resolved.

---

## 🧪 Testing Strategy Matrix

| Layer                          | Unit Testing                | Integration Testing                                    |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| **Backend (Express + Prisma)** | Vitest (`tests/unit/`)      | Vitest + Supertest with test DB (`tests/integration/`) |
| **Frontend (React + Vite)**    | Vitest (`src/**/*.test.ts`) | Vitest + React Testing Library (`src/**/*.test.tsx`)   |

---

## 🎨 Frontend Design System & Color Palette

All UI components MUST adhere strictly to the design tokens defined in [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md):

### 1. Core Palette

- **Primary (`--color-primary`)**: Crimson Red `#DC143C` (Dark `#B01030`) — Primary CTAs, active navigation items, active tab indicators, links, Admin accents, progress bars.
- **Secondary (`--color-secondary`)**: Warm Orange `#DA532C` — Class Representative (CR) role tags, CT session badges, secondary highlights.
- **Success (`--color-success`)**: Emerald Green `#16A34A` — Verified accounts, approved promotions, completed/active indicators.
- **Error (`--color-error`)**: Rose Red `#E11D48` — Room/time conflicts, cancelled classes, validation errors, locked accounts.
- **Gold / Amber (`--color-gold`)**: Amber `#F59E0B` — Holiday markers, rescheduled indicators, pending-review flags.
- **Background (`--color-bg`)**: Warm off-white `#FFFBFA` — Main application canvas.
- **Surface (`--color-surface`)**: Pure white `#FFFFFF` — Cards, modals, and panels.

### 2. Status & State Indicators

- **Scheduled**: Neutral gray `#F3F4F6` background with `#374151` text.
- **Cancelled**: Rose Red `#E11D48` text / tinted badge.
- **Rescheduled**: Amber `#F59E0B` text / tinted badge.
- **CT Session**: Warm Orange `#DA532C` badge.
- **Holiday (No Class)**: Amber `#F59E0B` badge.
- **Approved / Verified**: Emerald Green `#16A34A` badge.
- **Room / Time Conflict**: Rose Red `#E11D48` alert banner.

### 3. Role Badges

- **Student**: Neutral Slate Gray `#6B7280`
- **Class Representative (CR)**: Warm Orange `#DA532C`
- **Teacher**: Charcoal `#1F2937`
- **Admin**: Crimson Red `#DC143C`

### 4. Surface & Typography Tokens

- **Card Radius**: `16px` (`--radius-md`) to `20px` (`--radius-lg`).
- **Elevation / Shadow**: Soft elevation `0 4px 12px rgba(0, 0, 0, 0.06)` (`--shadow-soft`) — paired with soft shadows, **never hard borders**.
- **Headings**: `Poppins`, sans-serif (bold / semibold).
- **Body / UI Text**: `Inter`, sans-serif (regular / medium).

---

## Table of Contents

1. [Sprint 0: Initial Foundation & Project Setup Prompt](#sprint-0-initial-foundation--project-setup-prompt)
2. [Member 1: Auth-1 (Signup, Signin, Email Verification)](#member-1-auth-1-signup-signin-email-verification)
3. [Member 2: Auth-2 (Password Management & Session Invalidation)](#member-2-auth-2-password-management--session-invalidation)
4. [Member 3: Batch & Semester Management (Lifecycle & Promotion)](#member-3-batch--semester-management-lifecycle--promotion)
5. [Member 4: Class Update & Reschedule Management (Conflict Engine)](#member-4-class-update--reschedule-management-conflict-engine)
6. [Member 5: Result Generation & Examination Management](#member-5-result-generation--examination-management)
7. [Member 6: CT & Assignment Scheduling](#member-6-ct--assignment-scheduling)

---

## Sprint 0: Initial Foundation & Project Setup Prompt

> **Assigned to:** Lead / DevOps / Foundation  
> **Target Modules:** `server/`, `client/`, `prisma/`, `tests/`  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/backend_design.md`](file:///docs/backend_design.md), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), [`docs/adr/0002-node-express-prisma-postgres-stack.md`](file:///docs/adr/0002-node-express-prisma-postgres-stack.md)

```markdown
You are an autonomous senior full-stack engineer configuring the core foundation of the Smart_Schedular repository using the Matt Pocock engineering workflow.

### Objective

Scaffold and verify the end-to-end foundation for both the backend (`server/`) and frontend (`client/`), including Prisma schema initialization, database connection adapter, Express application pipeline, error handling, design system CSS tokens, and testing harnesses.

### Testing & CI Strategy

- Backend: Unit tests (Vitest) + Integration tests (Vitest + Supertest).
- Frontend: Unit tests (Vitest) + Component integration tests (Vitest + React Testing Library).
- Strict CI Quality Gate: Prettier format check, tsc --noEmit typecheck, Vitest test suites.

### Guidelines & Workflow

1. Review `CONTEXT.md`, `docs/backend_design.md`, and `docs/frontend_color_palate.md`.
2. Initialize `server/prisma/schema.prisma` with core domain models:
   - `User`, `RefreshToken`, `PreloadedStudent`, `PreloadedTeacher`
   - `Program`, `Batch`, `Semester`, `Course`, `Room`
   - `ScheduleEntry`, `Holiday`, `CTMark`, `Assignment`, `Resource`, `Result`, `PromotionRequest`, `Notification`, `AuditLog`
3. Configure `server/src/app.ts` with:
   - Security middleware (`cors`, json body parser)
   - Global error handler middleware and standard JSON response envelope (`sendSuccess`, `sendError`)
   - Health check endpoint `GET /api/v1/health`
4. Setup database connectivity using `@prisma/adapter-pg` connecting to Neon PostgreSQL.
5. Create Prisma seed script `server/prisma/seed.ts` seeding the 8 fixed departmental rooms:
   - R-101, R-102, R-103 (Classrooms)
   - R-201, R-203, R-302 (Computer Labs)
   - R-105 (Electrical Circuit Lab)
   - R-202 (Multipurpose Room)
6. Configure `client/src/index.css` with CSS custom properties and Tailwind tokens from `docs/frontend_color_palate.md`.
7. Setup testing harness in both workspaces:
   - `server/vitest.config.ts` for Supertest integration tests.
   - `client/vitest.config.ts` with React Testing Library.
8. Run full verification gates:
   - `cd server && npm test && npx prisma validate && npx tsc --noEmit`
   - `cd client && npm run build && npm run lint`
9. Execute `/code-review` before finalizing.
```

---

## Member 1: Auth-1 (Signup, Signin)

> **Assigned to:** Member 1  
> **Target Modules:** User Registration, Email Verification, Login & JWT Session Management  
> **SRS Requirements:** `FR-01` (Registration), `FR-02` (Email Verification), `FR-03` (Login), `AN-01` & `AN-02` (Preloaded Verification), `NFR-08` (Token Security)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L493), [`docs/backend_design.md`](file:///docs/backend_design.md#L91), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the Auth-1 module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for User Registration with Preloaded Roster Verification, Email Verification via Token/OTP, User Login with JWT Access + Hashed Refresh Tokens, and responsive authentication UI.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `authService.register`, `authService.verifyEmail`, `authService.login`, `tokenService.generateTokens`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/v1/auth/register`, `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `RegisterForm.test.tsx`, `LoginForm.test.tsx`, `EmailVerification.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- Canvas background: Warm off-white `#FFFBFA`.
- Auth Card container: Pure white `#FFFFFF` surface with `16–20px` border-radius and soft shadow `0 4px 12px rgba(0,0,0,0.06)` (no harsh borders).
- Primary CTAs (Sign In / Register buttons): Crimson Red `#DC143C` (hover `#B01030`), text white.
- Role selector tabs: Pill tabs styled with role colors:
  - Student: Slate Gray `#6B7280`
  - CR: Warm Orange `#DA532C`
  - Teacher: Charcoal `#1F2937`
  - Admin: Crimson Red `#DC143C`
- Success state (Verified checkmark): Emerald Green `#16A34A`.
- Error state (Account locked / invalid credentials): Rose Red `#E11D48`.
- Typography: Poppins for headings, Inter for input labels and body text.

### Domain Rules (from CONTEXT.md, ADR-0005, and docs/srs.md)

1. **Preloaded Verification**:
   - Students must provide a valid `universityId` that matches an unassigned record in `PreloadedStudent`.
   - Teachers must match `PreloadedTeacher` (uniqueId & institutional email).
   - CR registration requires admin pre-approval or preloaded CR designation.
2. **Email Verification & Transport (`ADR-0005`)**:
   - On signup, generate an expiring verification token/OTP (valid for 24 hours).
   - User status remains `isVerified: false` until email token is confirmed.
   - **Zero-Friction Dev/Test Transport**: In `NODE_ENV !== "production"`, log verification links and OTPs directly to the console/test response; route through SMTP transport only when SMTP environment variables are present.
3. **Session & Security**:
   - Issue short-lived Access Token (15m) and long-lived Refresh Token (7d).
   - Refresh tokens must be hashed with SHA-256 before storing in `RefreshToken` table.
   - Account lockout: Lock account for 15 minutes after 5 consecutive failed login attempts.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-01, FR-02, FR-03), `docs/backend_design.md`, `docs/frontend_color_palate.md`, and `docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical tracer-bullet slices:
   - Ticket 1: Database models (`User`, `RefreshToken`, `PreloadedStudent`, `PreloadedTeacher`) + Seed.
   - Ticket 2: `authService` & `emailService` + Unit tests using `/tdd` (Vitest).
   - Ticket 3: Express routes, Zod schemas, rate-limiting, and Supertest integration tests.
   - Ticket 4: React UI components (Register, Login, Verify Email) with React Testing Library tests.
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 2: Auth-2 (Password Management & Session Invalidation)

> **Assigned to:** Member 2  
> **Target Modules:** Password Change, Forgot Password, Reset Password, Session Revocation  
> **SRS Requirements:** `FR-04` (Password Change), `FR-05` (Forgot Password), `NFR-08` (Security & Invalidation)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L535), [`docs/backend_design.md`](file:///docs/backend_design.md#L91), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the Auth-2 (Password Management) module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the vertical tracer bullet for Password Change (authenticated), Forgot Password (unauthenticated email flow with single-use expiring token), Password Reset, automatic session invalidation across all devices, and the corresponding user interface.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `authService.changePassword`, `authService.forgotPassword`, `authService.resetPassword`, `tokenService.revokeAllUserTokens`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/v1/auth/change-password`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `ForgotPasswordForm.test.tsx`, `ResetPasswordForm.test.tsx`, `ChangePasswordModal.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- Card container: Pure white `#FFFFFF` surface with `16–20px` radius and soft elevation (`0 4px 12px rgba(0,0,0,0.06)`).
- Primary buttons (Submit Reset, Update Password): Crimson Red `#DC143C` (hover `#B01030`).
- Password Strength Meter: Multi-segment bar transitioning from Rose Red `#E11D48` (Weak) to Amber `#F59E0B` (Medium) to Emerald Green `#16A34A` (Strong).
- Alerts & Banners:
  - Expired / Invalid Token Banner: Rose Red `#E11D48` accent.
  - Password Reset Success Alert: Emerald Green `#16A34A` accent.
- Typography: Poppins headings, Inter body text.

### Domain Rules (from CONTEXT.md, ADR-0005, and docs/srs.md)

1. **Password Change**:
   - Authenticated endpoint requiring `currentPassword` and `newPassword`.
   - Validates old password hash with `bcrypt`.
   - Enforces password strength (min 8 chars, mixed case, numbers, special character).
2. **Forgot & Reset Password (`ADR-0005`)**:
   - `POST /api/v1/auth/forgot-password` generates a cryptographically secure, single-use token (valid for 15-30 minutes).
   - Generates password reset link/token using `emailService` (logged to console in dev/test, sent via SMTP in production).
   - `POST /api/v1/auth/reset-password` accepts token and new password, updates hash, and marks token as used.
3. **Session Invalidation**:
   - Upon successful password change or reset, revoke ALL existing active `RefreshToken` entries for that user (`revoked: true`).
   - Force re-authentication across all active sessions.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-04, FR-05), `docs/backend_design.md`, `docs/frontend_color_palate.md`, and `docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: Password reset token schema & revocation model.
   - Ticket 2: `passwordService` logic with Vitest unit tests (`/tdd`).
   - Ticket 3: Express routes, auth middleware, and Supertest integration tests.
   - Ticket 4: React UI components (Forgot Password, Reset Password with strength meter, Profile Change Password modal).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before PR finalization.
```

---

## Member 3: Batch & Semester Management (Lifecycle & Promotion)

> **Assigned to:** Member 3  
> **Target Modules:** Academic Catalog, Program, Batch, Semester, Promotion & Status Override  
> **SRS Requirements:** `FR-06` (Semester Creation), `FR-07` (Promotion Config), `FR-08` (Promotion Processing), `FR-09` (Student Semester Override), `AN-03` (Course Mapping)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L562), [`docs/backend_design.md`](file:///docs/backend_design.md#L100), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the Batch & Semester Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for Program/Batch management, Semester creation with course assignment, Batch-wide semester promotion processing, individual student semester overrides, and Admin management dashboard.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `semesterService.createSemester`, `promotionService.promoteBatch`, `studentService.overrideSemester`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/v1/admin/semesters`, `POST /api/v1/admin/batches/:id/promote`, `PATCH /api/v1/admin/students/:id/semester-override`, `GET /api/v1/batches`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `BatchManager.test.tsx`, `SemesterModal.test.tsx`, `PromotionWizard.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- Admin Canvas: Warm off-white `#FFFBFA` with Crimson Red `#DC143C` Admin accent badges.
- Cards & Data Tables: Pure white `#FFFFFF` surface with soft shadow (`0 4px 12px rgba(0,0,0,0.06)`), `16px` border-radius.
- Status Badges:
  - Active Semester: Emerald Green `#16A34A` background tint / text.
  - Archived Semester: Slate Gray `#6B7280`.
  - Pending Promotion Request: Amber `#F59E0B` tag.
- Primary Action (Promote Batch, Create Semester): Crimson Red `#DC143C` button.
- Typography: Poppins for batch/semester cards and table headers, Inter for student rosters and data rows.

### Domain Rules (from CONTEXT.md, ADR-0004, and docs/srs.md)

1. **Academic Hierarchy**:
   - `Program` (e.g., BSC_HONOURS) → `Batch` (e.g., Batch 51) → `Semester` (e.g., 3rd Year 1st Semester).
   - Only one active semester per batch at any given time.
2. **Semester Creation (`FR-06`)**:
   - Admin creates semester, links courses, and assigns instructors (Theory & Lab courses).
3. **Batch Promotion Lifecycle (`FR-07`, `FR-08`, `ADR-0004`)**:
   - Transition all active students in a batch to the next sequential semester (e.g., 2-2 → 3-1).
   - Archive previous semester routines and active schedule instances.
   - **CR Reset Rule**: All active `CR` roles in the batch are automatically reset to `STUDENT` upon promotion, requiring explicit reassignment/confirmation for the new semester.
4. **Student Status & Overrides (`FR-09`)**:
   - Support student status flags (`ACTIVE`, `PROMOTED`, `DEMOTED`, `DROPOUT`, `GRADUATED`).
   - Allow Admin to override a specific student's active semester for retake/readmission cases.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-06 to FR-09), `docs/backend_design.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: Prisma models (`Program`, `Batch`, `Semester`, `Course`) + indexes.
   - Ticket 2: Promotion & semester services (with CR reset logic) and Vitest unit tests (`/tdd`).
   - Ticket 3: Express routes with Admin RBAC and Supertest integration tests.
   - Ticket 4: Client React UI (Admin Batch & Semester Management, Promotion Wizard, Student Override panel).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 4: Class Update & Reschedule Management (Conflict Engine)

> **Assigned to:** Member 4  
> **Target Modules:** Day-Wise Schedule Instances, 3-Way Conflict Detection, Rescheduling & Cancellations  
> **SRS Requirements:** `FR-10` (Routine Generation), `FR-13` (Room Allocation), `FR-14` (Conflict Detection), `FR-15` (Cancellation), `FR-16` (Time Update), `FR-17` (Day Reassignment), `FR-18` (Holidays)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L616), [`docs/backend_design.md`](file:///docs/backend_design.md#L52), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), [`docs/adr/0003-three-way-conflict-detection-engine.md`](file:///docs/adr/0003-three-way-conflict-detection-engine.md), [`docs/adr/0004-sprint-1-core-architectural-decisions.md`](file:///docs/adr/0004-sprint-1-core-architectural-decisions.md)

```markdown
You are an autonomous full-stack engineer implementing the Class Update & Reschedule Management module with the 3-Way Conflict Detection Engine for Smart_Schedular.

### Objective

Implement the vertical tracer bullet for day-wise class schedule management, transactional 3-way conflict detection (Room, Teacher, Batch) with self-exclusion support, class rescheduling, cancellations, holiday declarations, and interactive routine UI.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `conflictService.checkOverlap`, `scheduleService.rescheduleClass`, `scheduleService.cancelClass`, `holidayService.declareHoliday`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/v1/schedules/check-conflict`, `PATCH /api/v1/schedules/:id/reschedule`, `PATCH /api/v1/schedules/:id/cancel`, `POST /api/v1/admin/holidays`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `ScheduleGrid.test.tsx`, `RescheduleModal.test.tsx`, `ConflictAlertBadge.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- Routine Grid Cells (State Badges):
  - Scheduled Class: Neutral gray `#F3F4F6` background with `#374151` text.
  - Cancelled Class: Rose Red `#E11D48` tag / strike-through text.
  - Rescheduled Class: Amber `#F59E0B` tag with new time slot.
  - CT Session: Warm Orange `#DA532C` badge.
  - Departmental Holiday: Amber `#F59E0B` banner across the routine column.
- Live Conflict Warning Banner: Rose Red `#E11D48` border with tinted background and detailed conflict text (e.g. "Room R-101 is already booked by Batch 51").
- Action Buttons:
  - Save / Confirm: Crimson Red `#DC143C`.
  - Cancel Class CTA: Rose Red outline / text `#E11D48`.
- Card container: Pure white `#FFFFFF` surface with `16–20px` radius and soft elevation (`0 4px 12px rgba(0,0,0,0.06)`).

### Domain Rules (from CONTEXT.md, ADR-0003, and ADR-0004)

1. **Mathematical Conflict Detection Formula**:
   - Overlap condition between proposed slot `[start_new, end_new]` and existing slot `[start_exist, end_exist]`:
     `start_new < end_exist AND end_new > start_exist`
   - Simultaneously checks:
     1. **Room Conflict**: `roomId` on date/day.
     2. **Teacher Conflict**: `teacherId` on date/day.
     3. **Batch Conflict**: `batchId` on date/day.
2. **Self-Exclusion (`excludeEntryId`)**:
   - `conflictService.checkOverlap` must support `{ excludeEntryId }` so updating an existing schedule entry doesn't conflict with its own current slot.
3. **Defensive Scheduling & Locking**:
   - Use database row locks (`SELECT ... FOR UPDATE`) or serializable transactions to prevent race-condition double bookings.
   - Reject conflicting requests with informative error payloads indicating the conflicting entity.
4. **Schedule Updates (`FR-15` to `FR-18`)**:
   - Teachers/CRs can reschedule or cancel instances.
   - Admin can declare departmental holidays (`FR-18`), automatically marking overlapping classes as `CANCELLED_HOLIDAY`.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-10 to FR-18), `docs/adr/0003-three-way-conflict-detection-engine.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `ScheduleEntry` and `Holiday` schema + composite indexes.
   - Ticket 2: `conflictService` (with `excludeEntryId` support) with comprehensive boundary test suite in Vitest (`/tdd`).
   - Ticket 3: Schedule modification routes with RBAC and Supertest integration tests.
   - Ticket 4: Client React UI (Interactive Schedule Grid, Reschedule Modal with live conflict validation badge, Cancellation confirmation).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before PR finalization.
```

---

## Member 5: Result Generation & Examination Management

> **Assigned to:** Member 5  
> **Target Modules:** Semester Final Result Upload, Grade Tabulation, Public & Student Result Display  
> **SRS Requirements:** `FR-22` (Exam Routine), `FR-25` (Result Upload by CR), `FR-26` (Public Result Page)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L783), [`docs/backend_design.md`](file:///docs/backend_design.md#L100), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), [`docs/adr/0004-sprint-1-core-architectural-decisions.md`](file:///docs/adr/0004-sprint-1-core-architectural-decisions.md)

```markdown
You are an autonomous full-stack engineer implementing the Result Generation & Examination Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the vertical tracer bullet for CR Semester Final Result uploading, structured grade tabulation, GPA/CGPA calculations, dual-hybrid result storage (relational records + archived file resource), and public/student result searching and viewing.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `resultService.parseAndValidateGradeSheet`, `resultService.calculateGPA`, `resultService.publishResult`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/v1/results/upload`, `GET /api/v1/results/query`, `GET /api/v1/results/student/:id`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `ResultUploadForm.test.tsx`, `ResultQueryView.test.tsx`, `GradeSheetTable.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- Role Tag: Warm Orange `#DA532C` badge for CR uploader.
- Results Table & Grade Cards: Pure white `#FFFFFF` surface with soft shadow (`0 4px 12px rgba(0,0,0,0.06)`), `16px` border-radius.
- Grade Badges:
  - Outstanding (GPA ≥ 3.75 / A+, A): Emerald Green `#16A34A`.
  - Pass (GPA 2.50–3.74): Charcoal `#1F2937` or slate gray `#6B7280`.
  - Fail / Retake (F): Rose Red `#E11D48`.
- Search & Filter Controls: Crimson Red `#DC143C` active filter highlights and Search CTA.
- Typography: Poppins bold for GPA scores and headings, Inter for course tabular data.

### Domain Rules (from CONTEXT.md, ADR-0004, and docs/srs.md)

1. **Dual-Hybrid Result Upload by CR (`FR-25`, `ADR-0004`)**:
   - CR uploads semester grade sheet (CSV/spreadsheet or PDF document).
   - Tabular rows parse and validate into individual relational `Result` records (`gpa`, `cgpa`, `courseMarks` JSON) mapped to each `universityId`.
   - The raw source document/PDF is archived under the `Resource` repository for full-batch downloads.
   - Validates student ID matches, course codes, letter grades, and grade point scales (JU Grading Policy: A+, A, A-, B+, B, etc.).
2. **Result Verification & Publication**:
   - Admin or automated integrity check verifies GPA calculations before marking status as `PUBLISHED`.
3. **Public & Student Result Access (`FR-26`)**:
   - Public / authenticated result query page allowing lookup by Program, Batch, Semester, and Roll / Registration Number.
   - Personalized result card in Student Dashboard.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-22, FR-25, FR-26), `docs/backend_design.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `Result` and `Resource` Prisma models + storage relations.
   - Ticket 2: Result parsing, GPA calculation algorithms, and validation service with Vitest unit tests (`/tdd`).
   - Ticket 3: Express routes with CR upload authorization and Supertest integration tests.
   - Ticket 4: Client React UI (CR Result Upload view with preview table, Public Result Search page, Student Result Card).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
7. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
8. Run `/code-review` before finalizing.
```

---

## Member 6: CT & Assignment Scheduling

> **Assigned to:** Member 6  
> **Target Modules:** Class Test (CT) Scheduling, CT Marks Upload, Assignment Distribution & Submissions  
> **SRS Requirements:** `FR-19` (CT Scheduling), `FR-20` (CT Marks Upload), `FR-21` (Assignment Creation), `FR-27` (CT Marks View by Student)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L741), [`docs/backend_design.md`](file:///docs/backend_design.md#L100), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the CT & Assignment Scheduling module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the vertical tracer bullet for Class Test (CT) scheduling (integrated with conflict detection for rooms and batches), CT marks tabulation/upload by Teachers, Assignment distribution with deadlines, and Student CT marks visibility.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `ctService.scheduleCT`, `marksService.uploadMarks`, `marksService.calculateBestOf`, `assignmentService.createAssignment`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/v1/assessments/ct`, `POST /api/v1/assessments/ct/:id/marks`, `GET /api/v1/assessments/ct/student/:id`, `POST /api/v1/assessments/assignments`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `CTSchedulingForm.test.tsx`, `CTMarksTable.test.tsx`, `AssignmentCard.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- CT Session Badge: Warm Orange `#DA532C` badge / tag.
- Assignment Due Date Tags:
  - Upcoming / Open: Slate Gray `#6B7280` or Charcoal `#1F2937`.
  - Due Soon (≤24h): Amber `#F59E0B`.
  - Overdue / Closed: Rose Red `#E11D48`.
- Marks Entry & Performance Cards: Pure white `#FFFFFF` surface with `16px` border-radius and soft shadow (`0 4px 12px rgba(0,0,0,0.06)`).
- Action Buttons (Schedule CT, Create Assignment, Submit Marks): Crimson Red `#DC143C` (hover `#B01030`).
- Typography: Poppins for assessment titles and stat counters, Inter for descriptions and marks tables.

### Domain Rules (from CONTEXT.md, ADR-0005, and docs/srs.md)

1. **CT Scheduling (`FR-19`)**:
   - Teacher schedules CT for a course specifying date, time slot, syllabus, and room.
   - Validates against room and batch conflicts using the `conflictService`.
   - Prevents booking multiple CTs for the same batch on the same date unless confirmed with warning.
2. **CT Marks Management & Aggregation (`FR-20`, `FR-27`, `ADR-0005`)**:
   - Teacher uploads marks (total marks, obtained marks per student).
   - Computes assessment aggregate according to course policy:
     - `BEST_3_OF_4` (Default JU CSE departmental policy).
     - `AVERAGE_ALL` (Average of all conducted CTs).
     - `BEST_2_OF_3` / `BEST_N_OF_M` (Custom policy).
   - Students can view their breakdown and class statistics in their dashboard (`FR-27`).
3. **Assignment Management & Submissions (`FR-21`, `ADR-0005`)**:
   - Teacher creates assignment with title, description, attachments, due date/time, and submission instructions.
   - Supports dual submission mode: external URL links (e.g. GitHub/Google Drive) and direct document attachments.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-19, FR-20, FR-21, FR-27), `docs/backend_design.md`, `docs/frontend_color_palate.md`, and `docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `CTSchedule`, `CTMark`, `Assignment`, `AssignmentSubmission` Prisma schema + constraints.
   - Ticket 2: CT scheduling with conflict checking + marks aggregation service in Vitest (`/tdd`).
   - Ticket 3: Express routes with Teacher authorization and Supertest integration tests.
   - Ticket 4: Client React UI (Teacher CT & Assignment scheduler, Marks entry table, Student CT Marks & Assignment cards).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```
