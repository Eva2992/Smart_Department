# Smart Department — TypeDoc Code Documentation Engineering Prompts

This document contains standardized, copy-pasteable autonomous agent prompts to **generate comprehensive codebase documentation using TypeDoc** for the **Smart Department (JU CSE Academic Operations Platform)** repository.

The platform's features (backend API, database schema, conflict engine, routine management, assessments, and client UI) have already been built and are fully operational. However, the codebase was initially created without comprehensive inline documentation.

Each prompt below guides an autonomous engineer or contributor to systematically document a specific module of the existing codebase using **TypeDoc** according to [`docs/documentation.md`](file:///docs/documentation.md) and [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md).

Prompts follow the **Matt Pocock Engineering Skills Suite** workflow:

```
/grill-with-docs → /to-spec → /to-tickets → /implement (doc annotations) → /code-review
```

---

## 🛡️ Continuous Integration (CI) Quality Gates

On every push and pull request, the CI pipeline enforces strict verification:

1. **Install Dependencies**: `npm ci` across root, `server/`, and `client/`.
2. **Format Check**: `npx prettier --check .` to catch unformatted code.
3. **Type Check**: `tsc --noEmit` / `npm run typecheck` (TypeScript strict mode in both `server/` and `client/`).
4. **Automated Testing Suite**:
   - Backend unit tests via Vitest (`tests/unit/`).
   - Backend integration tests via Supertest against PostgreSQL container (`tests/integration/`).
   - Frontend unit and component integration tests via Vitest and React Testing Library.
5. **Documentation Build & AST Verification**: `npm run build:docs` (TypeDoc compilation under `server/` verifying zero TypeScript AST parsing failures, valid `{@link}` symbol references, and up-to-date API docs in `server/docs/api`).
6. **Quality Gate Rule**: If any check fails, the pull request is **strictly blocked from merging** until resolved.

### Verification Commands

- **Backend (`server/`)**: `npm test` (Vitest) && `npx tsc --noEmit` && `npm run prisma:validate` && `npm run build` && `npm run build:docs`
- **Frontend (`client/`)**: `npm test` (Vitest) && `npm run typecheck` && `npm run lint` && `npm run build`
- **Root Monorepo**: `npm run validate` (executes lint, typecheck, unit/integration tests, production build, TypeDoc doc build, and format check).

---

## 🧪 Testing Strategy Matrix

| Layer                          | Unit Testing                | Integration Testing                                    |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| **Backend (Express + Prisma)** | Vitest (`tests/unit/`)      | Vitest + Supertest with test DB (`tests/integration/`) |
| **Frontend (React + Vite)**    | Vitest (`src/**/*.test.ts`) | Vitest + React Testing Library (`src/**/*.test.tsx`)   |

---

## 📚 TypeDoc & Code Documentation Standards

All backend modules, services, controllers, interfaces, and shared types MUST strictly adhere to the TypeDoc guidelines defined in [`docs/documentation.md`](file:///docs/documentation.md) and [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md):

### 1. Direct AST Integration & Zero Type Duplication

- TypeDoc extracts types directly from the TypeScript compiler (`tsc`) Abstract Syntax Tree.
- **NEVER duplicate type annotations inside JSDoc comments** (e.g., write `@param userId - The unique identifier` instead of `@param {string} userId`).
- Comments must focus on **domain intent, algorithmic rules, boundary constraints, and error semantics**, not redundant type signatures.

### 2. Mandatory JSDoc Block Tags

All exported symbols (functions, methods, classes, interfaces, types, enums) must include standard JSDoc block comments (`/** ... */`):

- **Functions & Methods (`@param`, `@returns`, `@throws`, `@example`)**:
  - `@param <name> - <description>`: Required for all input parameters. Detail edge cases and allowed ranges.
  - `@returns <description>`: Clear description of the returned promise or value.
  - `@throws {ErrorType} <description>`: Explicitly state all domain, validation, and HTTP exceptions thrown.
  - `@example`: Functional markdown code snippets illustrating typical invocations.
- **Classes & Services (`public`, `private`, `protected`, `@abstract`)**:
  - Class-level docstrings describing domain responsibilities.
  - Explicit visibility modifiers and `@abstract` tags where applicable.
- **Interfaces & Types**:
  - Interface-level explanation followed by JSDoc property docstrings explaining each field.
- **Enums**:
  - Enum-level description and explanations for each individual enum member.
- **Cross-Referencing (`{@link}`)**:
  - Use `{@link TargetSymbol}` (e.g., `{@link conflictService.checkOverlap}`) to create hyperlinked references to related models, services, and routes.

### 3. Verification & Local Inspection

- Generate API documentation: `npm run build:docs` (generates searchable static site in `server/docs/api`).
- Development watch mode: `npm run docs:watch --prefix server`.
- Preview output in browser: `npx serve server/docs/api`.

---

## Table of Contents

1. [Sprint 0: DevOps & Infrastructure Documentation Prompt](#sprint-0-devops--infrastructure-documentation-prompt)
2. [Member 1: Auth-1 & Identity Management Documentation Prompt](#member-1-auth-1--identity-management-documentation-prompt)
3. [Member 2: Auth-2 & Password Management Documentation Prompt](#member-2-auth-2--password-management-documentation-prompt)
4. [Member 3: Academic Catalog, Batch & Semester Documentation Prompt](#member-3-academic-catalog-batch--semester-documentation-prompt)
5. [Member 4: Routine, Scheduling & 3-Way Conflict Engine Documentation Prompt](#member-4-routine-scheduling--3-way-conflict-engine-documentation-prompt)
6. [Member 5: Result Generation & Examination Management Documentation Prompt](#member-5-result-generation--examination-management-documentation-prompt)
7. [Member 6: Assessment (CT & Assignment) Management Documentation Prompt](#member-6-assessment-ct--assignment-management-documentation-prompt)

---

## Sprint 0: DevOps & Infrastructure Documentation Prompt

> **Assigned to:** Lead / DevOps / Architecture  
> **Target Existing Files:** `server/src/server.ts`, `server/src/app.ts`, `server/src/lib/prisma.ts`, `server/src/config/env.ts`, `server/src/config/upload.ts`, `server/src/middleware/errorHandler.ts`, `server/src/utils/response.ts`, `server/typedoc.json`  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md), [`docs/adr/0002-node-express-prisma-postgres-stack.md`](file:///docs/adr/0002-node-express-prisma-postgres-stack.md)

```markdown
You are an autonomous senior engineer documenting the core infrastructure, server pipeline, and configuration of the existing Smart Department platform using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc documentation to the already implemented server pipeline, database client, environment configuration, error handling middleware, and JSON response utility functions. Verify that the TypeDoc documentation build executes cleanly with 0 errors and 0 warnings.

### Existing Files to Document

1. `server/src/server.ts`: HTTP server initialization, port binding, and graceful shutdown handlers.
2. `server/src/app.ts`: Express application factory, security middleware assembly (`cors`, `helmet`, json parser), and route mounting.
3. `server/src/lib/prisma.ts`: PrismaClient singleton instance and Neon PostgreSQL connection adapter.
4. `server/src/config/env.ts`: Environment variable schema validation (Zod) and application runtime settings.
5. `server/src/config/upload.ts`: Multer disk storage and file upload configuration for study resources and grade sheets.
6. `server/src/middleware/errorHandler.ts`: Global Express error handling middleware, AppError hierarchy, and unhandled exception logging.
7. `server/src/utils/response.ts`: Standard JSON API response envelope utilities (`sendSuccess`, `sendError`).

### Documentation Deliverables

- **AST Synchronization**: Document all exported functions, types, and interfaces using standard tags (`@param`, `@returns`, `@throws`, `@example`).
- **Zero Type Duplication**: Omit redundant `{type}` notations in comments. Let TypeDoc extract types from TypeScript AST.
- **Cross-References**: Use `{@link sendSuccess}`, `{@link sendError}`, and `{@link AppError}` across middleware and response utilities.
- **TypeDoc Build Check**: Ensure `server/typedoc.json` compiles the documented symbols into `server/docs/api` with zero errors.

### Step-by-Step Workflow

1. Review `docs/documentation.md` and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect `server/src/app.ts`, `server/src/config/env.ts`, and `server/src/utils/response.ts`.
3. Add full JSDoc block comments (`/** ... */`) to each exported function and configuration object.
4. Run TypeDoc build: `npm run build:docs`.
5. Run test suite to verify no functional code regressions: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```

---

## Member 1: Auth-1 & Identity Management Documentation Prompt

> **Assigned to:** Member 1  
> **Target Existing Files:** `server/src/services/auth.service.ts` (registration, login, JWT token generation), `server/src/services/preloaded.service.ts`, `server/src/controllers/auth.controller.ts`, `server/src/routes/auth.route.ts`, `server/src/types/auth.ts`, `server/src/validators/auth.validator.ts`, `server/src/middleware/auth.ts`, `server/src/middleware/rbac.ts`  
> **SRS Requirements:** `FR-01` (Registration), `FR-03` (Login), `AN-01` & `AN-02` (Preloaded Verification), `NFR-08` (Token Security)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0006-retire-email-verification-and-streamline-roster-auth.md`](file:///docs/adr/0006-retire-email-verification-and-streamline-roster-auth.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md)

```markdown
You are an autonomous full-stack engineer documenting the existing Auth-1 & Identity Management module for Smart Department using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc comments to all existing authentication services, preloaded roster validation logic, authentication controllers, JWT middleware, and RBAC guards. Do not modify the underlying application logic.

### Existing Code to Document

1. `server/src/services/auth.service.ts`:
   - `register`: User registration with preloaded roster matching, password hashing, and immediate JWT session generation (`ADR-0006`).
   - `login`: Credential validation, lockout tracking, and token pair issuance.
   - `generateTokens`: Access token (15m) and refresh token (7d) signing.
   - `refreshAccessToken`: Hashed refresh token verification and rotation.
   - `logout`: Token revocation logic.
2. `server/src/services/preloaded.service.ts`:
   - Student roster matching by University ID and email.
   - Teacher roster matching by institutional email.
3. `server/src/middleware/auth.ts`:
   - JWT extraction, Bearer token verification, and `req.user` payload attachment.
4. `server/src/middleware/rbac.ts`:
   - Role-based authorization middleware (`authorizeRole`, `requireAdmin`, `requireTeacherOrCR`).
5. `server/src/types/auth.ts` & `server/src/validators/auth.validator.ts`:
   - DTO interfaces, login/registration Zod schemas, and session token types.

### Documentation Requirements (from docs/documentation.md & ADR-0008)

- **Standard Tags**: Every public function and method must have `@param <name> - <description>`, `@returns <description>`, `@throws {AppError} <description>`, and `@example` usage blocks.
- **Zero Type Duplication**: Never write `@param {string} email`. Use `@param email - User institutional email address`.
- **Cross-References**: Use `{@link User}`, `{@link PreloadedStudent}`, and `{@link RefreshToken}` to link domain entities.
- **Domain Invariants**: Document account lockout mechanics (5 failed attempts -> 15 min lock) and preloaded roster derivation.

### Step-by-Step Workflow

1. Review `docs/documentation.md`, `docs/adr/0006-retire-email-verification-and-streamline-roster-auth.md`, and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect the existing implementations in `server/src/services/auth.service.ts` and `server/src/services/preloaded.service.ts`.
3. Add complete TypeDoc comments to all service methods, middleware functions, and DTO interfaces.
4. Verify documentation build: `npm run build:docs` (0 errors, 0 warnings).
5. Verify test suite passes without regression: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```

---

## Member 2: Auth-2 & Password Management Documentation Prompt

> **Assigned to:** Member 2  
> **Target Existing Files:** `server/src/services/auth.service.ts` (password change, forgot password, reset password), `server/src/services/email.service.ts`, `server/src/jobs/purgeUnverifiedAccounts.job.ts`, `server/src/utils/token.ts`, `server/src/validators/auth.validator.ts`  
> **SRS Requirements:** `FR-04` (Password Change), `FR-05` (Forgot Password), `NFR-08` (Security & Invalidation)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`](file:///docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md)

```markdown
You are an autonomous full-stack engineer documenting the existing Auth-2 (Password Management & Session Invalidation) module for Smart Department using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc comments to the existing password management operations, cryptographically secure token generators, email transport dispatchers, and session revocation models.

### Existing Code to Document

1. `server/src/services/auth.service.ts` (Password Operations):
   - `changePassword`: Authenticated password change with old password verification and strength enforcement.
   - `forgotPassword`: Single-use expiring reset token generation and email dispatch.
   - `resetPassword`: Password reset via token, password update, and global session revocation.
   - `revokeAllUserTokens`: Invalidation of all active `RefreshToken` records for a user (`revoked: true`).
2. `server/src/services/email.service.ts`:
   - Zero-friction development transport (console logging in non-production environments).
   - Production SMTP email transport dispatcher.
   - Password reset email templating and dispatch.
3. `server/src/utils/token.ts`:
   - Cryptographic random token generation and SHA-256 hash digests.
4. `server/src/jobs/purgeUnverifiedAccounts.job.ts`:
   - Background cleanup job for expired session tokens.

### Documentation Requirements (from docs/documentation.md & ADR-0008)

- **Standard Tags**: Document all functions and utilities with `@param`, `@returns`, `@throws`, and `@example`.
- **Security Context**: Detail encryption standards (bcrypt salt rounds, SHA-256 digests) and token expiry lifetimes directly in docstrings.
- **Cross-References**: Link related components using `{@link emailService.sendPasswordResetEmail}` and `{@link authService.resetPassword}`.
- **Zero Type Duplication**: Rely on TypeScript compiler AST for parameter and return types.

### Step-by-Step Workflow

1. Review `docs/documentation.md`, `docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`, and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect `server/src/services/auth.service.ts` (password methods) and `server/src/services/email.service.ts`.
3. Add complete TypeDoc comments to all password-related methods and email dispatch functions.
4. Verify doc build: `npm run build:docs` (0 errors, 0 warnings).
5. Verify test suite passes cleanly: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```

---

## Member 3: Academic Catalog, Batch & Semester Documentation Prompt

> **Assigned to:** Member 3  
> **Target Existing Files:** `server/src/services/semester.service.ts`, `server/src/services/batch.service.ts`, `server/src/services/student.service.ts`, `server/src/services/promotion.service.ts`, `server/src/controllers/semester.controller.ts`, `server/src/controllers/batch.controller.ts`, `server/src/controllers/student.controller.ts`, `server/src/controllers/promotion.controller.ts`, `server/src/routes/semester.route.ts`, `server/src/routes/batch.route.ts`, `server/src/routes/promotion.route.ts`, `server/src/types/academic.ts`, `server/src/validators/academic.validator.ts`  
> **SRS Requirements:** `FR-06` (Semester Creation), `FR-07` (Promotion Config), `FR-08` (Promotion Processing), `FR-09` (Student Semester Override), `AN-03` (Course Mapping)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0004-sprint-1-core-architectural-decisions.md`](file:///docs/adr/0004-sprint-1-core-architectural-decisions.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md)

```markdown
You are an autonomous full-stack engineer documenting the existing Academic Catalog, Batch & Semester Management module for Smart Department using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc comments to the existing academic hierarchy services, course mapping handlers, batch promotion processors, and student semester override logic.

### Existing Code to Document

1. `server/src/services/semester.service.ts`:
   - `createSemester`: Creation of academic terms, course bindings, and instructor allocations.
   - `getSemestersByBatch`: Querying active and archived semesters.
2. `server/src/services/batch.service.ts`:
   - Cohort management (`Program` -> `Batch` hierarchy) and batch status tracking.
3. `server/src/services/promotion.service.ts`:
   - `promoteBatch`: Batch-wide sequential promotion (e.g., 2-2 -> 3-1) with routine archiving.
   - **CR Reset Enforcement**: Automatic reset of all active `CR` roles back to `STUDENT` upon batch promotion (`ADR-0004`).
4. `server/src/services/student.service.ts`:
   - Student roster querying, status transitions (`ACTIVE`, `PROMOTED`, `DEMOTED`, `DROPOUT`, `GRADUATED`), and admin semester override for retakes/readmission.
5. `server/src/types/academic.ts` & `server/src/validators/academic.validator.ts`:
   - DTOs, payload schemas, and academic status enums.

### Documentation Requirements (from docs/documentation.md & ADR-0008)

- **Standard Tags**: Provide `@param`, `@returns`, `@throws {AppError}`, and `@example` for all service methods.
- **Academic Hierarchy Documentation**: Document the domain invariant that only one semester per batch may be active at any time.
- **Cross-References**: Use `{@link Batch}`, `{@link Semester}`, `{@link Course}`, and `{@link StudentStatus}`.
- **Zero Type Duplication**: Omit redundant types from JSDoc tags.

### Step-by-Step Workflow

1. Review `docs/documentation.md`, `docs/adr/0004-sprint-1-core-architectural-decisions.md`, and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect `server/src/services/semester.service.ts`, `batch.service.ts`, and `promotion.service.ts`.
3. Add complete TypeDoc comments to all functions, methods, and exported types.
4. Verify documentation build: `npm run build:docs` (0 errors, 0 warnings).
5. Verify test suite passes cleanly: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```

---

## Member 4: Routine, Scheduling & 3-Way Conflict Engine Documentation Prompt

> **Assigned to:** Member 4  
> **Target Existing Files:** `server/src/services/conflictService.ts`, `server/src/services/conflict.service.ts`, `server/src/services/scheduleService.ts`, `server/src/services/holidayService.ts`, `server/src/controllers/schedule.controller.ts`, `server/src/controllers/routine.controller.ts`, `server/src/controllers/holiday.controller.ts`, `server/src/controllers/room.controller.ts`, `server/src/routes/schedule.routes.ts`, `server/src/routes/routine.routes.ts`, `server/src/routes/holiday.routes.ts`, `server/src/routes/room.routes.ts`, `server/src/utils/timeUtils.ts`  
> **SRS Requirements:** `FR-10` (Routine Generation), `FR-13` (Room Allocation), `FR-14` (Conflict Detection), `FR-15` (Cancellation), `FR-16` (Time Update), `FR-17` (Day Reassignment), `FR-18` (Holidays)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0003-three-way-conflict-detection-engine.md`](file:///docs/adr/0003-three-way-conflict-detection-engine.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md)

```markdown
You are an autonomous full-stack engineer documenting the existing Routine, Scheduling & 3-Way Conflict Detection Engine for Smart Department using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc comments to the 3-way conflict detection algorithm, defensive schedule modification services, holiday cascade declarations, and time calculation utilities.

### Existing Code to Document

1. `server/src/services/conflictService.ts`:
   - `checkOverlap`: Transactional 3-way conflict detection checking Room, Teacher, and Batch overlap.
   - **Mathematical Overlap Formula**: Document `start_new < end_exist AND end_new > start_exist`.
   - **Self-Exclusion (`excludeEntryId`)**: Document how updating an existing slot avoids self-conflict false positives.
   - Database row locking (`SELECT ... FOR UPDATE`) to prevent concurrent double bookings.
2. `server/src/services/scheduleService.ts`:
   - `createScheduleEntry`: Validating and persisting schedule slots.
   - `rescheduleClass`: Rescheduling with transactional conflict checks.
   - `cancelClass`: Updating class state to `CANCELLED`.
   - `getScheduleByBatch`, `getScheduleByTeacher`, `getScheduleByRoom`.
3. `server/src/services/holidayService.ts`:
   - `declareHoliday`: Creating holiday records and automatically flagging overlapping scheduled slots as `CANCELLED_HOLIDAY`.
4. `server/src/utils/timeUtils.ts`:
   - Time string parsing (`HH:mm`), minute conversions, and interval overlap predicates.

### Documentation Requirements (from docs/documentation.md & ADR-0008)

- **Standard Tags**: Provide detailed `@param`, `@returns`, `@throws {ConflictError}`, and `@example` code snippets.
- **Mathematical Formula**: Explicitly write out the interval condition in the `checkOverlap` docstring.
- **Cross-References**: Use `{@link ScheduleEntry}`, `{@link Room}`, `{@link ClassState}`, and `{@link Holiday}`.
- **Zero Type Duplication**: Never write redundant `{type}` syntax in comments.

### Step-by-Step Workflow

1. Review `docs/documentation.md`, `docs/adr/0003-three-way-conflict-detection-engine.md`, and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect `server/src/services/conflictService.ts`, `scheduleService.ts`, and `holidayService.ts`.
3. Add complete TypeDoc comments to all exported methods and interfaces.
4. Verify documentation build: `npm run build:docs` (0 errors, 0 warnings).
5. Verify test suite passes without regressions: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```

---

## Member 5: Result Generation & Examination Management Documentation Prompt

> **Assigned to:** Member 5  
> **Target Existing Files:** `server/src/services/result.service.ts`, `server/src/services/examService.ts`, `server/src/services/resource.service.ts`, `server/src/controllers/result.controller.ts`, `server/src/controllers/exam.controller.ts`, `server/src/controllers/resource.controller.ts`, `server/src/routes/result.route.ts`, `server/src/routes/exam.routes.ts`, `server/src/routes/resource.route.ts`, `server/src/types/result.ts`, `server/src/types/exam.ts`, `server/src/types/resource.ts`, `server/src/validators/result.validator.ts`, `server/src/validators/exam.validator.ts`, `server/src/validators/resource.validator.ts`  
> **SRS Requirements:** `FR-22` (Exam Routine), `FR-25` (Result Upload by CR), `FR-26` (Public Result Page)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0004-sprint-1-core-architectural-decisions.md`](file:///docs/adr/0004-sprint-1-core-architectural-decisions.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md)

```markdown
You are an autonomous full-stack engineer documenting the existing Result Generation & Examination Management module for Smart Department using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc comments to the grade sheet parsing engine, JU GPA calculation algorithms, dual-hybrid result storage architecture, and final exam scheduling services.

### Existing Code to Document

1. `server/src/services/result.service.ts`:
   - `parseAndValidateGradeSheet`: CSV and spreadsheet parser extracting individual student rows.
   - `calculateGPA`: Official JU CSE Grading Scale calculation (A+, A, A-, B+, B, etc., credit-weighted GPA/CGPA).
   - `publishResult`: Verification of student records and transitioning result status to `PUBLISHED`.
   - `getResultsByBatch`, `getStudentResult`: Query handlers for public and personalized result cards.
2. `server/src/services/examService.ts`:
   - Final examination routine generation, room allocation for exam sessions, and invigilator mapping.
3. `server/src/services/resource.service.ts`:
   - Dual-hybrid result archiving: saving the raw CSV/PDF grade sheet into the `Resource` repository for full-batch downloads (`ADR-0004`).
4. `server/src/types/result.ts` & `server/src/types/exam.ts`:
   - Result records, CourseMarks JSON schema, and exam session interfaces.

### Documentation Requirements (from docs/documentation.md & ADR-0008)

- **Standard Tags**: Annotate all methods with `@param`, `@returns`, `@throws {AppError}`, and `@example`.
- **Grading Scale Documentation**: Document the exact GPA point scale and credit calculation formulas.
- **Cross-References**: Use `{@link Result}`, `{@link Resource}`, and `{@link ExamSchedule}`.
- **Zero Type Duplication**: Omit redundant `{type}` comments.

### Step-by-Step Workflow

1. Review `docs/documentation.md`, `docs/adr/0004-sprint-1-core-architectural-decisions.md`, and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect `server/src/services/result.service.ts` and `server/src/services/examService.ts`.
3. Add complete TypeDoc comments to all grade processing methods, algorithms, and interfaces.
4. Verify documentation build: `npm run build:docs` (0 errors, 0 warnings).
5. Verify test suite passes without regressions: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```

---

## Member 6: Assessment (CT & Assignment) Management Documentation Prompt

> **Assigned to:** Member 6  
> **Target Existing Files:** `server/src/services/ct.service.ts`, `server/src/services/assignment.service.ts`, `server/src/controllers/assessments.controller.ts`, `server/src/routes/assessments.route.ts`, `server/src/validators/assessment.validator.ts`  
> **SRS Requirements:** `FR-19` (CT Scheduling), `FR-20` (CT Marks Upload), `FR-21` (Assignment Creation), `FR-27` (CT Marks View by Student)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/documentation.md`](file:///docs/documentation.md), [`docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`](file:///docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md), [`docs/adr/0008-typedoc-documentation-standard.md`](file:///docs/adr/0008-typedoc-documentation-standard.md)

```markdown
You are an autonomous full-stack engineer documenting the existing Assessment (CT & Assignment) Management module for Smart Department using TypeDoc.

### Objective

Add comprehensive, TypeDoc-compliant JSDoc comments to Class Test (CT) scheduling, score aggregation algorithms, assignment distribution, deadline validation, and student performance visibility services.

### Existing Code to Document

1. `server/src/services/ct.service.ts`:
   - `scheduleCT`: CT scheduling integrated with the 3-way conflict detection engine.
   - `uploadMarks`: Tabulation of student assessment scores.
   - `calculateBestOf`: Configurable aggregation policies per course:
     - `BEST_3_OF_4`: Default JU CSE departmental policy.
     - `AVERAGE_ALL`: Arithmetic mean of all conducted quizzes.
     - `BEST_2_OF_3` / `BEST_N_OF_M`: Custom course policy.
   - `getStudentCTMarks`: Student dashboard aggregation queries.
2. `server/src/services/assignment.service.ts`:
   - `createAssignment`: Task creation with deadline, syllabus, and attachment metadata.
   - `submitAssignment`: Dual-mode submission handling (external URLs and direct file uploads).
   - `getAssignmentsByBatch`, `getSubmissionsByAssignment`.
3. `server/src/validators/assessment.validator.ts`:
   - Validation schemas for CT scheduling, marks entry, and assignments.

### Documentation Requirements (from docs/documentation.md & ADR-0008)

- **Standard Tags**: Provide `@param`, `@returns`, `@throws {AppError}`, and `@example` for all service methods.
- **Aggregation Policy Documentation**: Document the exact sorting, filtering, and mathematical average algorithms in `calculateBestOf`.
- **Cross-References**: Use `{@link CTSchedule}`, `{@link CTMark}`, and `{@link Assignment}`.
- **Zero Type Duplication**: Rely on TypeScript compiler AST for parameter and return types.

### Step-by-Step Workflow

1. Review `docs/documentation.md`, `docs/adr/0005-email-transport-ct-aggregation-and-assignment-storage.md`, and `docs/adr/0008-typedoc-documentation-standard.md`.
2. Inspect `server/src/services/ct.service.ts` and `server/src/services/assignment.service.ts`.
3. Add complete TypeDoc comments to all assessment methods, policies, and types.
4. Verify documentation build: `npm run build:docs` (0 errors, 0 warnings).
5. Verify test suite passes without regressions: `cd server && npm test && npx tsc --noEmit`.
6. Run `/code-review` before finalizing.
```
