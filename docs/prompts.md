# Sprint 1 Engineering Prompts (Matt Pocock Skills Suite)

This document contains standardized, copy-pasteable autonomous agent prompts for **Sprint 1** of the **Smart_Schedular (JU CSE Academic Management System)** project. 

Each prompt is structured for the **Matt Pocock Engineering Skills Suite** workflow:
```
/grill-with-docs → /to-spec → /to-tickets → /implement (with /tdd) → /code-review
```

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

> **Assigned to:** Lead / DevOps / Any Member initiating the repository  
> **Target Modules:** `server/`, `client/`, `prisma/`, `tests/`  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/backend_design.md`](file:///docs/backend_design.md), [`docs/adr/0002-node-express-prisma-postgres-stack.md`](file:///docs/adr/0002-node-express-prisma-postgres-stack.md)

```markdown
You are an autonomous senior full-stack engineer configuring the core foundation of the Smart_Schedular repository using the Matt Pocock engineering workflow.

### Objective
Scaffold and verify the end-to-end foundation for both the backend (`server/`) and frontend (`client/`), including Prisma schema initialization, database connection adapter, Express application pipeline, error handling, and testing harness.

### Guidelines & Workflow
1. Read `CONTEXT.md`, `docs/backend_design.md`, and `docs/adr/0002-node-express-prisma-postgres-stack.md` to align on conventions.
2. Initialize `server/prisma/schema.prisma` with core domain models:
   - `User`, `RefreshToken`, `PreloadedStudent`, `PreloadedTeacher`
   - `Program`, `Batch`, `Semester`, `Course`, `Room`
   - `ClassSchedule`, `CTSchedule`, `Assignment`, `Result`
3. Configure `server/src/app.ts` with:
   - Security middleware (`helmet`, `cors`, json body parser)
   - Global error handler middleware and standard JSON response envelope
   - Health check endpoint `GET /api/v1/health`
4. Setup database connectivity using `@prisma/adapter-pg` connecting to Neon PostgreSQL.
5. Create Prisma seed script `server/prisma/seed.ts` seeding the 8 fixed departmental rooms:
   - R-101, R-102, R-103 (Classrooms)
   - R-201, R-203, R-302 (Computer Labs)
   - R-105 (Electrical Circuit Lab)
   - R-202 (Multipurpose Room)
6. Setup testing harness:
   - Vitest config in `server/` with Supertest helper
   - Basic smoke test for `GET /api/v1/health`
7. Run verification commands:
   - `cd server && npm test`
   - `cd server && npx prisma validate`
   - `cd client && npm run build`
8. Execute `/code-review` before finalizing.
```

---

## Member 1: Auth-1 (Signup, Signin, Email Verification)

> **Assigned to:** Member 1  
> **Target Modules:** User Registration, Email Verification, Login & JWT Session Management  
> **SRS Requirements:** `FR-01` (Registration), `FR-02` (Email Verification), `FR-03` (Login), `AN-01` & `AN-02` (Preloaded Verification), `NFR-08` (Token Security)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L493), [`docs/backend_design.md`](file:///docs/backend_design.md#L91)

```markdown
You are an autonomous full-stack engineer implementing the Auth-1 module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective
Implement the complete vertical tracer bullet for User Registration with Preloaded Roster Verification, Email Verification via Token/OTP, and User Login with JWT Access + Hashed Refresh Tokens.

### Domain Rules (from CONTEXT.md and docs/srs.md)
1. **Preloaded Verification**:
   - Students must provide a valid `universityId` that matches an unassigned record in `PreloadedStudent`.
   - Teachers must match `PreloadedTeacher` (uniqueId & institutional email).
   - CR registration requires admin pre-approval or preloaded CR designation.
2. **Email Verification**:
   - On signup, generate an expiring verification token/OTP (valid for 24 hours).
   - User status remains `isVerified: false` until email token is confirmed.
3. **Session & Security**:
   - Issue short-lived Access Token (15m) and long-lived Refresh Token (7d).
   - Refresh tokens must be hashed with SHA-256 before storing in `RefreshToken` table.
   - Account lockout: Lock account for 15 minutes after 5 consecutive failed login attempts.

### Workflow & Seams
1. Run `/grill-with-docs` or review `docs/srs.md` (FR-01, FR-02, FR-03) and `docs/backend_design.md`.
2. Run `/to-spec` to define test seams:
   - Unit Seams: `authService.register`, `authService.verifyEmail`, `authService.login`, `tokenService.generateTokens`.
   - Integration Seams: `POST /api/v1/auth/register`, `POST /api/v1/auth/verify-email`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: Database models (`User`, `RefreshToken`, `PreloadedStudent`, `PreloadedTeacher`) + Seed.
   - Ticket 2: `authService` + Unit tests using `/tdd`.
   - Ticket 3: Express controllers, Zod validation schemas, and rate-limiting middleware.
   - Ticket 4: Client React UI (Register page with role tabs, Login page, Verification screen).
4. Run `/implement` with `/tdd` to write unit and integration tests first.
5. Verify with `cd server && npm test` and `cd client && npm test`.
6. Run `/code-review` to confirm clean architecture and spec compliance.
```

---

## Member 2: Auth-2 (Password Management & Session Invalidation)

> **Assigned to:** Member 2  
> **Target Modules:** Password Change, Forgot Password, Reset Password, Session Revocation  
> **SRS Requirements:** `FR-04` (Password Change), `FR-05` (Forgot Password), `NFR-08` (Security & Invalidation)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L535), [`docs/backend_design.md`](file:///docs/backend_design.md#L91)

```markdown
You are an autonomous full-stack engineer implementing the Auth-2 (Password Management) module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective
Implement the vertical tracer bullet for Password Change (authenticated), Forgot Password (unauthenticated email flow with single-use expiring token), Password Reset, and automatic session invalidation (revoking all active refresh tokens).

### Domain Rules (from CONTEXT.md and docs/srs.md)
1. **Password Change**:
   - Authenticated endpoint requiring `currentPassword` and `newPassword`.
   - Validates old password hash with `bcrypt`.
   - Enforces password strength (min 8 chars, mixed case, numbers, special char).
2. **Forgot & Reset Password**:
   - `POST /api/v1/auth/forgot-password` generates a cryptographically secure, single-use token (valid for 15-30 minutes).
   - Generates password reset email/link.
   - `POST /api/v1/auth/reset-password` accepts token and new password, updates hash, and marks token as used.
3. **Session Invalidation**:
   - Upon successful password change or reset, revoke ALL existing active `RefreshToken` entries for that user (`revoked: true`).
   - Force re-authentication across all active sessions.

### Workflow & Seams
1. Run `/grill-with-docs` or review `docs/srs.md` (FR-04, FR-05) and `docs/backend_design.md`.
2. Run `/to-spec` to define test seams:
   - Unit Seams: `authService.changePassword`, `authService.forgotPassword`, `authService.resetPassword`, `tokenService.revokeAllUserTokens`.
   - Integration Seams: `POST /api/v1/auth/change-password`, `POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: Password reset token schema & revocation model.
   - Ticket 2: `passwordService` logic with TDD unit tests.
   - Ticket 3: Express routes, auth middleware, and Zod validators.
   - Ticket 4: Client React UI (Forgot Password form, Reset Password view with token URL parser, Profile Change Password modal).
4. Run `/implement` with `/tdd` ensuring all negative cases (expired token, reused token, wrong old password) are tested.
5. Verify with `cd server && npm test` and `cd client && npm test`.
6. Run `/code-review` before PR finalization.
```

---

## Member 3: Batch & Semester Management (Lifecycle & Promotion)

> **Assigned to:** Member 3  
> **Target Modules:** Academic Catalog, Program, Batch, Semester, Promotion & Status Override  
> **SRS Requirements:** `FR-06` (Semester Creation), `FR-07` (Promotion Config), `FR-08` (Promotion Processing), `FR-09` (Student Semester Override), `AN-03` (Course Mapping)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L562), [`docs/backend_design.md`](file:///docs/backend_design.md#L100)

```markdown
You are an autonomous full-stack engineer implementing the Batch & Semester Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective
Implement the complete vertical tracer bullet for Program/Batch management, Semester creation with course assignment, Batch-wide semester promotion processing, and individual student semester overrides (for retake/readmitted students).

### Domain Rules (from CONTEXT.md and docs/srs.md)
1. **Academic Hierarchy**:
   - `Program` (e.g., BSC_HONOURS) → `Batch` (e.g., Batch 51) → `Semester` (e.g., 3rd Year 1st Semester).
   - Only one active semester per batch at any given time.
2. **Semester Creation (`FR-06`)**:
   - Admin creates semester, links courses, and assigns instructors (Theory & Lab courses).
3. **Batch Promotion Lifecycle (`FR-07`, `FR-08`)**:
   - Transition all active students in a batch to the next sequential semester (e.g., 2-2 → 3-1).
   - Archive previous semester routines and active schedule instances.
4. **Student Status & Overrides (`FR-09`)**:
   - Support student status flags (`ACTIVE`, `PROMOTED`, `DEMOTED`, `DROPOUT`, `GRADUATED`).
   - Allow Admin to override a specific student's active semester for retake/readmission cases without modifying batch-level records.

### Workflow & Seams
1. Run `/grill-with-docs` or review `docs/srs.md` (FR-06, FR-07, FR-08, FR-09) and `docs/backend_design.md`.
2. Run `/to-spec` to define test seams:
   - Unit Seams: `semesterService.createSemester`, `promotionService.promoteBatch`, `studentService.overrideSemester`.
   - Integration Seams: `POST /api/v1/admin/semesters`, `POST /api/v1/admin/batches/:id/promote`, `PATCH /api/v1/admin/students/:id/semester-override`, `GET /api/v1/batches`.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: Prisma models (`Program`, `Batch`, `Semester`, `Course`, `StudentEnrollment`).
   - Ticket 2: Promotion & semester services with transactional safety and unit tests (`/tdd`).
   - Ticket 3: Express routes with Admin RBAC middleware and Zod validators.
   - Ticket 4: Client React UI (Admin Batch & Semester Management dashboard, Promotion modal, Student override panel).
4. Run `/implement` with `/tdd`.
5. Verify with `cd server && npm test` and `cd client && npm test`.
6. Run `/code-review` before finalizing.
```

---

## Member 4: Class Update & Reschedule Management (Conflict Engine)

> **Assigned to:** Member 4  
> **Target Modules:** Day-Wise Schedule Instances, 3-Way Conflict Detection, Rescheduling & Cancellations  
> **SRS Requirements:** `FR-10` (Routine Generation), `FR-13` (Room Allocation), `FR-14` (Conflict Detection), `FR-15` (Cancellation), `FR-16` (Time Update), `FR-17` (Day Reassignment), `FR-18` (Holidays)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L616), [`docs/backend_design.md`](file:///docs/backend_design.md#L52), [`docs/adr/0003-three-way-conflict-detection-engine.md`](file:///docs/adr/0003-three-way-conflict-detection-engine.md)

```markdown
You are an autonomous full-stack engineer implementing the Class Update & Reschedule Management module with the 3-Way Conflict Detection Engine for Smart_Schedular.

### Objective
Implement the vertical tracer bullet for day-wise class schedule management, transactional 3-way conflict detection (Room, Teacher, Batch), class rescheduling, time adjustments, cancellations, and holiday declarations.

### Domain Rules (from CONTEXT.md and ADR-0003)
1. **Mathematical Conflict Detection Formula**:
   - Overlap condition between proposed slot `[start_new, end_new]` and existing slot `[start_exist, end_exist]`:
     `start_new < end_exist AND end_new > start_exist`
   - Must simultaneously check:
     1. **Room Conflict**: `roomId` on date/day.
     2. **Teacher Conflict**: `teacherId` on date/day.
     3. **Batch Conflict**: `batchId` on date/day.
2. **Defensive Scheduling & Locking**:
   - Use database row locks (`SELECT ... FOR UPDATE`) or serializable transactions to prevent race-condition double bookings.
   - Reject conflicting requests with informative error payloads indicating the conflicting entity.
3. **Schedule Updates (`FR-15` to `FR-18`)**:
   - Teachers/CRs can reschedule or cancel instances.
   - Admin can declare departmental holidays (`FR-18`), automatically marking overlapping classes as `CANCELLED_HOLIDAY`.

### Workflow & Seams
1. Run `/grill-with-docs` or review `docs/srs.md` (FR-10 to FR-18) and `docs/adr/0003-three-way-conflict-detection-engine.md`.
2. Run `/to-spec` to define test seams:
   - Unit Seams: `conflictService.checkOverlap`, `scheduleService.rescheduleClass`, `scheduleService.cancelClass`, `holidayService.declareHoliday`.
   - Integration Seams: `POST /api/v1/schedules/check-conflict`, `PATCH /api/v1/schedules/:id/reschedule`, `PATCH /api/v1/schedules/:id/cancel`, `POST /api/v1/admin/holidays`.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `ClassSchedule` and `Holiday` schema + indexed queries.
   - Ticket 2: `conflictService` with comprehensive boundary test suite in Vitest (`/tdd`).
   - Ticket 3: Schedule modification routes with RBAC (Teacher/CR/Admin permissions).
   - Ticket 4: Client React UI (Interactive Schedule Grid, Reschedule Modal with live conflict validation badge, Cancellation confirmation).
4. Run `/implement` with `/tdd`.
5. Verify with `cd server && npm test` and `cd client && npm test`.
6. Run `/code-review` before finalizing.
```

---

## Member 5: Result Generation & Examination Management

> **Assigned to:** Member 5  
> **Target Modules:** Semester Final Result Upload, Grade Tabulation, Public & Student Result Display  
> **SRS Requirements:** `FR-22` (Exam Routine), `FR-25` (Result Upload by CR), `FR-26` (Public Result Page)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L783), [`docs/backend_design.md`](file:///docs/backend_design.md#L100)

```markdown
You are an autonomous full-stack engineer implementing the Result Generation & Examination Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective
Implement the vertical tracer bullet for CR Semester Final Result uploading, structured grade tabulation, GPA/CGPA calculations, result publication, and public/student result searching and viewing.

### Domain Rules (from CONTEXT.md and docs/srs.md)
1. **Result Upload by CR (`FR-25`)**:
   - CR uploads semester grade sheet (CSV/structured format or PDF document) for their specific batch and semester.
   - Validates student ID matches, course codes, letter grades, and grade point scales (JU Grading Policy: A+, A, A-, B+, B, etc.).
2. **Result Verification & Publication**:
   - Admin or automated integrity check verifies GPA calculations before marking status as `PUBLISHED`.
3. **Public & Student Result Access (`FR-26`)**:
   - Public / authenticated result query page allowing lookup by Program, Batch, Semester, and Roll / Registration Number.
   - Personalized result card in Student Dashboard.

### Workflow & Seams
1. Run `/grill-with-docs` or review `docs/srs.md` (FR-22, FR-25, FR-26) and `docs/backend_design.md`.
2. Run `/to-spec` to define test seams:
   - Unit Seams: `resultService.parseAndValidateGradeSheet`, `resultService.calculateGPA`, `resultService.publishResult`.
   - Integration Seams: `POST /api/v1/results/upload`, `GET /api/v1/results/query`, `GET /api/v1/results/student/:id`.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `Result`, `GradeItem`, `ExamRoutine` Prisma models.
   - Ticket 2: Result parsing, GPA calculation algorithms, and validation service with Vitest (`/tdd`).
   - Ticket 3: Express routes with CR upload authorization and public query filters.
   - Ticket 4: Client React UI (CR Result Upload view with preview table, Public Result Search page, Student Result Card).
4. Run `/implement` with `/tdd`.
5. Verify with `cd server && npm test` and `cd client && npm test`.
6. Run `/code-review` before finalizing.
```

---

## Member 6: CT & Assignment Scheduling

> **Assigned to:** Member 6  
> **Target Modules:** Class Test (CT) Scheduling, CT Marks Upload, Assignment Distribution & Submissions  
> **SRS Requirements:** `FR-19` (CT Scheduling), `FR-20` (CT Marks Upload), `FR-21` (Assignment Creation), `FR-27` (CT Marks View by Student)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L741), [`docs/backend_design.md`](file:///docs/backend_design.md#L100)

```markdown
You are an autonomous full-stack engineer implementing the CT & Assignment Scheduling module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective
Implement the vertical tracer bullet for Class Test (CT) scheduling (integrated with conflict detection for rooms and batches), CT marks tabulation/upload by Teachers, Assignment distribution with deadlines, and Student CT marks visibility.

### Domain Rules (from CONTEXT.md and docs/srs.md)
1. **CT Scheduling (`FR-19`)**:
   - Teacher schedules CT for a course specifying date, time slot, syllabus, and room (or online).
   - Validates against room and batch conflicts using the `conflictService`.
   - Prevents booking multiple CTs for the same batch on the same date unless confirmed with warning.
2. **CT Marks Management (`FR-20`, `FR-27`)**:
   - Teacher uploads marks (total marks, obtained marks per student).
   - Computes assessment summary (average, highest, best N-of-M CT policy).
   - Students can view their breakdown and class statistics in their dashboard (`FR-27`).
3. **Assignment Management (`FR-21`)**:
   - Teacher creates assignment with title, description, attachments, due date/time, and submission instructions.

### Workflow & Seams
1. Run `/grill-with-docs` or review `docs/srs.md` (FR-19, FR-20, FR-21, FR-27) and `docs/backend_design.md`.
2. Run `/to-spec` to define test seams:
   - Unit Seams: `ctService.scheduleCT`, `marksService.uploadMarks`, `marksService.calculateBestOf`, `assignmentService.createAssignment`.
   - Integration Seams: `POST /api/v1/assessments/ct`, `POST /api/v1/assessments/ct/:id/marks`, `GET /api/v1/assessments/ct/student/:id`, `POST /api/v1/assessments/assignments`.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `CTSchedule`, `CTMark`, `Assignment` Prisma schema.
   - Ticket 2: CT scheduling with conflict checking + marks calculation service in Vitest (`/tdd`).
   - Ticket 3: Express routes with Teacher authorization middleware and Zod validators.
   - Ticket 4: Client React UI (Teacher CT & Assignment scheduler, Marks entry table, Student CT Marks & Assignment cards).
4. Run `/implement` with `/tdd`.
5. Verify with `cd server && npm test` and `cd client && npm test`.
6. Run `/code-review` before finalizing.
```
