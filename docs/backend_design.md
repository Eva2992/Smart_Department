# Backend Design — Smart Department

JU CSE Department Academic Management System

This document translates the SRS into a concrete backend design: stack decisions, project structure, data model, API surface, and the core engines (auth, conflict detection, notifications). It builds on the architecture decisions already made (MVC pattern, Prettier, Vitest/Supertest, GitHub Actions CI) and adds the pieces needed to actually implement the backend.

## 1. Tech Stack

| Layer                            | Technology                                          | Status                 |
| -------------------------------- | --------------------------------------------------- | ---------------------- |
| Runtime                          | Node.js LTS + TypeScript (strict mode)              | Decided                |
| Framework                        | Express.js                                          | Decided                |
| Database                         | PostgreSQL, hosted on Neon                          | Decided                |
| ORM                              | Prisma                                              | Decided                |
| DB Driver                        | `pg` (node-postgres), via Prisma driver adapter     | Decided                |
| Auth                             | JWT (access + refresh) + bcrypt + RBAC middleware   | Decided                |
| Architecture Pattern             | MVC                                                 | Decided (previous doc) |
| Testing                          | Vitest + Supertest                                  | Decided (previous doc) |
| Formatting                       | Prettier                                            | Decided (previous doc) |
| CI                               | GitHub Actions                                      | Decided (previous doc) |
| Documentation                    | TypeDoc (TSDoc comments → generated reference site) | Decided                |
| Scheduled jobs                   | `node-cron`, in-process                             | Suggested              |
| Input validation                 | Zod                                                 | Suggested              |
| Security headers / rate limiting | `helmet`, `express-rate-limit`                      | Suggested              |

Rows marked "Suggested" aren't locked in — flagging them here so they can be confirmed or swapped in review, same as the testing/CI docs.

## 2. Why `pg` + Prisma + Neon Together

This looks like three database tools doing one job, so it's worth spelling out how they fit.

| Piece      | Role                                                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Neon**   | Where the Postgres database actually lives. Serverless Postgres — scales to zero when idle, gives you branching (useful for PR previews), and exposes both a pooled and a direct connection string. |
| **Prisma** | The ORM layer — schema modeling, type-safe queries, and migrations (`prisma migrate`). This is what the app code talks to day-to-day.                                                               |
| **`pg`**   | The actual driver that opens the TCP connection to Neon, plugged into Prisma via `@prisma/adapter-pg`.                                                                                              |

The one decision worth explaining is _why `pg` and not Neon's own serverless driver_ (`@neondatabase/serverless`, used via `@prisma/adapter-neon`):

| Option                                         | Fits when...                                                                                                                                      | Fits Smart Department?                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `@prisma/adapter-neon` (HTTP/WebSocket driver) | App runs on the edge or in short-lived serverless functions (Vercel Edge, Cloudflare Workers, Lambda) that can't hold a persistent TCP connection | No — Express runs as a normal long-lived Node process     |
| `@prisma/adapter-pg` (node-postgres)           | App is a standard persistent server, connecting over TCP                                                                                          | Yes — this is the recommended setup for exactly this case |

So: **`@prisma/adapter-pg`**, backed by `pg`, connecting to Neon's pooled endpoint. Two connection strings are needed (both from the Neon console):

```
DATABASE_URL="postgresql://user:pass@ep-xxxx-pooler.region.aws.neon.tech/smartdept?sslmode=require"   # app runtime (pooled)
<!-- DIRECT_URL="postgresql://user:pass@ep-xxxx.region.aws.neon.tech/smartdept?sslmode=require"             # prisma migrate (direct) -->
```

The pooled connection (`-pooler` in the hostname, backed by PgBouncer) is what the running app uses. `prisma migrate` needs the direct connection since schema changes don't play well through a pooler. This is also why the conflict-detection engine (§7) drops to raw `pg` queries in places — Prisma's client is great for CRUD, but the room/teacher/batch overlap check benefits from a hand-tuned indexed query and `SELECT ... FOR UPDATE` row locking, which is easiest to reason about with direct SQL.

## 3. Project Structure (MVC)

```
backend/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                # seeds the 8 fixed rooms (R-101...R-202), etc.
├── src/
│   ├── config/                 # env loading, db client, constants
│   ├── controllers/             # HTTP layer only — parse request, call service, shape response
│   ├── services/                 # business logic (conflictService, promotionService, notificationService...)
│   ├── routes/                    # Express routers, grouped by module
│   ├── middleware/                # auth, RBAC, ownership checks, error handler, rate limiting
│   ├── validators/                 # request schemas (Zod)
│   ├── jobs/                        # node-cron tasks (unverified account purge, archive cleanup)
│   ├── types/                        # shared TS types/interfaces
│   ├── utils/                         # helpers (date/time overlap math, token signing, etc.)
│   ├── app.ts                          # Express app assembly
│   └── server.ts                        # entrypoint
├── tests/
│   ├── unit/                    # services, utils — Vitest
│   └── integration/              # routes via Supertest
├── docs/                          # TypeDoc output (generated, gitignored)
├── typedoc.json
├── tsconfig.json
└── .env
```

Controllers stay thin — they should not contain conflict-checking logic, promotion rules, or query-building. That all lives in `services/`, which is what unit tests target directly without needing an HTTP layer.

## 4. Database Design

PostgreSQL, modeled through Prisma. Laid out in three passes below: entities grouped by SRS module (§4.1–4.6, for quick reference against the FRs), an ERD showing how they connect (§4.7), then the actual `schema.prisma` they're generated from (§4.8) and the indexing strategy behind it (§4.9).

Grouped by SRS module rather than listed alphabetically, since that's closer to how the FRs read.

### 4.1 Identity & Access — FR-01 to FR-05, AN-01, AN-02

| Entity             | Key Fields                                                                                                                                 | Notes                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `User`             | id, name, universityId, email, passwordHash, role (STUDENT/CR/TEACHER/ADMIN), isVerified, isChairman, batchId?, program?, teacherUniqueId? | One table for all four roles, discriminated by `role`. Keeps auth/RBAC logic in one place instead of four parallel user tables. |
| `RefreshToken`     | id, userId, tokenHash, expiresAt, revoked                                                                                                  | Refresh tokens are stored hashed and revocable, per NFR-08.                                                                     |
| `PreloadedStudent` | universityId, name, email, batchId, program                                                                                                | Admin-entered verification source for registration (AN-01).                                                                     |
| `PreloadedTeacher` | uniqueId, name, email, designation, isChairman                                                                                             | Admin-entered verification source for registration (AN-02).                                                                     |

### 4.2 Academic Structure — FR-06, AN-03

| Entity     | Key Fields                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `Batch`    | id, name (e.g. "52nd"), program (HONOURS/MASTERS), currentSemesterId, status (ACTIVE/COMPLETED) |
| `Semester` | id, name, batchId, startDate, endDate, status (ACTIVE/ARCHIVED), archivedAt                     |
| `Course`   | id, name, code, creditHours, semesterId, teacherId                                              |

### 4.3 Scheduling — FR-10 to FR-19, FR-22, R-01

| Entity          | Key Fields                                                                                                                                                             | Notes                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `Room`          | id, roomNumber (unique), type (CLASSROOM/COMPUTER_LAB/ELECTRICAL_LAB/MULTIPURPOSE), description                                                                        | Seeded once from the fixed 8-room list in the SRS (C-02) — not user-creatable in v1.  |
| `ScheduleEntry` | id, type (CLASS/CT/EXAM/SEMINAR), status (SCHEDULED/CANCELLED/RESCHEDULED/HOLIDAY), courseId?, batchId, teacherId, roomId, date, startTime, endTime, topic?, createdBy | One unified table for classes, CTs, exams, and seminars, distinguished by `type`.     |
| `Holiday`       | id, date, reason, scope (ALL/BATCH), batchId?                                                                                                                          | Declaring a holiday flips overlapping `ScheduleEntry` rows to status HOLIDAY (FR-18). |

Using one `ScheduleEntry` table instead of separate `Class`, `CT`, `Exam`, `Seminar` tables is the one non-obvious modeling call here — worth a quick justification since FR-19 literally describes a class slot being _converted_ into a CT ("The class for that slot is automatically converted to a CT session"). A single table with a `type` column makes that a one-field update. It also means the conflict-detection engine (§7) only ever queries one table regardless of what kind of event is being checked, instead of running the same overlap check four times against four tables.

### 4.4 Assessment — FR-20, FR-21, FR-27

| Entity       | Key Fields                                                                   |
| ------------ | ---------------------------------------------------------------------------- |
| `CTMark`     | id, scheduleEntryId (the CT), studentId, marksObtained, maxMarks, uploadedAt |
| `Assignment` | id, courseId, batchId, teacherId, title, description, dueDate                |

### 4.5 Resources & Results — FR-23 to FR-26

| Entity     | Key Fields                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Resource` | id, title, courseName, semesterLabel, year, type (NOTES/SLIDES/PAST_PAPER/OTHER), fileUrl, fileSizeBytes, uploaderId, downloadCount |
| `Result`   | id, batchId, semesterId, studentId, universityId, courseMarks (JSON), gpa?, cgpa?, uploadedBy, publishedAt                          |

### 4.6 Operations

| Entity             | Key Fields                                                                                                  | Maps to            |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| `PromotionRequest` | id, batchId, semesterId, requestedBy, status (PENDING/APPROVED/REJECTED), reason?, reviewedBy?, reviewedAt? | FR-07, FR-08       |
| `Notification`     | id, userId, type, message, relatedEntityType?, relatedEntityId?, isRead, createdAt                          | FR-31              |
| `AuditLog`         | id, userId, action, entityType, entityId, ipAddress, details (JSON), createdAt                              | R-02, R-06, NFR-12 |

R-03 (data loss on premature promotion) is handled at the `Semester` level: promotion doesn't delete rows, it sets `status = ARCHIVED` and `archivedAt = now()`. A scheduled job (§6) permanently deletes archived semesters past the retention window instead of the promotion endpoint doing it inline.

### 4.7 Entity Relationship Diagram

```mermaid
erDiagram
    BATCH ||--o{ SEMESTER : has
    BATCH ||--o| SEMESTER : "current semester"
    BATCH ||--o{ USER : enrolls
    BATCH ||--o{ PRELOADED_STUDENT : "verification source for"
    SEMESTER ||--o{ COURSE : offers
    USER ||--o{ COURSE : teaches
    COURSE ||--o{ SCHEDULE_ENTRY : "scheduled as"
    BATCH ||--o{ SCHEDULE_ENTRY : has
    USER ||--o{ SCHEDULE_ENTRY : teaches
    ROOM ||--o{ SCHEDULE_ENTRY : hosts
    SCHEDULE_ENTRY ||--o{ CT_MARK : graded
    USER ||--o{ CT_MARK : receives
    COURSE ||--o{ ASSIGNMENT : has
    BATCH ||--o{ ASSIGNMENT : "assigned to"
    BATCH ||--o{ HOLIDAY : "may scope to"
    USER ||--o{ RESOURCE : uploads
    BATCH ||--o{ RESULT : has
    SEMESTER ||--o{ RESULT : has
    USER ||--o{ RESULT : "belongs to (student)"
    BATCH ||--o{ PROMOTION_REQUEST : requests
    SEMESTER ||--o{ PROMOTION_REQUEST : from
    USER ||--o{ PROMOTION_REQUEST : "filed by (CR)"
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs
    USER ||--o{ REFRESH_TOKEN : holds
```

Two things worth calling out that aren't obvious from the boxes:

- `Batch.currentSemesterId` is a separate pointer from `Semester.batchId` — a batch has many semesters over its lifetime, but only one is "current" at a time. That's the `BATCH ||--o| SEMESTER : "current semester"` line — it's what routine generation, dashboards, and promotion all read from instead of querying for "the active one."
- `ScheduleEntry.courseId` is nullable (not drawn as a hard dependency above) — seminars and workshops (C-07) go through the same table but aren't tied to a course.

### 4.8 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ---------- Enums ----------

enum Role {
  STUDENT
  CR
  TEACHER
  ADMIN
}

enum Program {
  HONOURS
  MASTERS
}

enum BatchStatus {
  ACTIVE
  COMPLETED
}

enum SemesterStatus {
  ACTIVE
  ARCHIVED
}

enum RoomType {
  CLASSROOM
  COMPUTER_LAB
  ELECTRICAL_LAB
  MULTIPURPOSE
}

enum ScheduleEntryType {
  CLASS
  CT
  EXAM
  SEMINAR
}

enum ScheduleEntryStatus {
  SCHEDULED
  CANCELLED
  RESCHEDULED
  HOLIDAY
}

enum HolidayScope {
  ALL
  BATCH
}

enum ResourceType {
  NOTES
  SLIDES
  PAST_PAPER
  OTHER
}

enum PromotionStatus {
  PENDING
  APPROVED
  REJECTED
}

// ---------- Identity & Access ----------

model User {
  id              String    @id @default(uuid())
  name            String
  email           String    @unique
  universityId    String?   @unique // students
  teacherUniqueId String?   @unique // teachers
  passwordHash    String
  role            Role
  program         Program? // students only
  batchId         String?
  batch           Batch?    @relation("BatchStudents", fields: [batchId], references: [id])
  isChairman      Boolean   @default(false) // teachers only
  isVerified      Boolean   @default(false)
  failedAttempts  Int       @default(0)
  lockedUntil     DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  refreshTokens      RefreshToken[]
  coursesTaught      Course[]           @relation("CourseTeacher")
  taughtEntries      ScheduleEntry[]    @relation("EntryTeacher")
  createdEntries     ScheduleEntry[]    @relation("EntryCreatedBy")
  assignments        Assignment[]       @relation("AssignmentTeacher")
  ctMarks            CTMark[]           @relation("StudentCTMarks")
  uploadedResources  Resource[]         @relation("ResourceUploader")
  studentResults     Result[]           @relation("StudentResults")
  uploadedResults    Result[]           @relation("ResultUploader")
  promotionRequests  PromotionRequest[] @relation("PromotionRequestedBy")
  reviewedPromotions PromotionRequest[] @relation("PromotionReviewedBy")
  notifications      Notification[]
  auditLogs          AuditLog[]

  @@index([batchId])
  @@index([role])
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique
  expiresAt DateTime
  revoked   Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
}

model PreloadedStudent {
  universityId String  @id
  name         String
  email        String
  batchId      String
  batch        Batch   @relation(fields: [batchId], references: [id])
  program      Program
}

model PreloadedTeacher {
  uniqueId    String  @id
  name        String
  email       String
  designation String
  isChairman  Boolean @default(false)
}

// ---------- Academic Structure ----------

model Batch {
  id                String      @id @default(uuid())
  name              String      @unique // e.g. "52nd"
  program           Program
  status            BatchStatus @default(ACTIVE)
  currentSemesterId String?     @unique
  currentSemester   Semester?   @relation("CurrentSemester", fields: [currentSemesterId], references: [id])

  students          User[]             @relation("BatchStudents")
  semesters         Semester[]         @relation("BatchSemesters")
  scheduleEntries   ScheduleEntry[]
  assignments       Assignment[]
  holidays          Holiday[]
  results           Result[]
  promotionRequests PromotionRequest[]
  preloadedStudents PreloadedStudent[]
}

model Semester {
  id         String         @id @default(uuid())
  name       String // e.g. "4th Year 2nd Semester"
  batchId    String
  batch      Batch          @relation("BatchSemesters", fields: [batchId], references: [id])
  startDate  DateTime
  endDate    DateTime
  status     SemesterStatus @default(ACTIVE)
  archivedAt DateTime?

  courses           Course[]
  results           Result[]
  promotionRequests PromotionRequest[]
  currentForBatch   Batch?             @relation("CurrentSemester")

  @@index([batchId, status])
}

model Course {
  id          String   @id @default(uuid())
  name        String
  code        String
  creditHours Float
  semesterId  String
  semester    Semester @relation(fields: [semesterId], references: [id])
  teacherId   String
  teacher     User     @relation("CourseTeacher", fields: [teacherId], references: [id])

  scheduleEntries ScheduleEntry[]
  assignments     Assignment[]

  @@index([semesterId])
  @@index([teacherId])
}

// ---------- Scheduling ----------

model Room {
  id          String   @id @default(uuid())
  roomNumber  String   @unique // R-101 ... R-202
  type        RoomType
  description String?

  scheduleEntries ScheduleEntry[]
}

model ScheduleEntry {
  id          String              @id @default(uuid())
  type        ScheduleEntryType
  status      ScheduleEntryStatus @default(SCHEDULED)
  courseId    String?
  course      Course?             @relation(fields: [courseId], references: [id])
  batchId     String
  batch       Batch               @relation(fields: [batchId], references: [id])
  teacherId   String
  teacher     User                @relation("EntryTeacher", fields: [teacherId], references: [id])
  roomId      String
  room        Room                @relation(fields: [roomId], references: [id])
  date        DateTime            @db.Date
  startTime   DateTime            @db.Time
  endTime     DateTime            @db.Time
  topic       String? // CT topic
  createdById String
  createdBy   User                @relation("EntryCreatedBy", fields: [createdById], references: [id])
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  ctMarks CTMark[]

  @@index([roomId, date])
  @@index([teacherId, date])
  @@index([batchId, date])
}

model Holiday {
  id      String       @id @default(uuid())
  date    DateTime     @db.Date
  reason  String
  scope   HolidayScope
  batchId String?
  batch   Batch?       @relation(fields: [batchId], references: [id])

  @@index([date])
}

// ---------- Assessment ----------

model CTMark {
  id              String        @id @default(uuid())
  scheduleEntryId String
  scheduleEntry   ScheduleEntry @relation(fields: [scheduleEntryId], references: [id])
  studentId       String
  student         User          @relation("StudentCTMarks", fields: [studentId], references: [id])
  marksObtained   Float
  maxMarks        Float
  uploadedAt      DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([scheduleEntryId, studentId])
}

model Assignment {
  id          String   @id @default(uuid())
  courseId    String
  course      Course   @relation(fields: [courseId], references: [id])
  batchId     String
  batch       Batch    @relation(fields: [batchId], references: [id])
  teacherId   String
  teacher     User     @relation("AssignmentTeacher", fields: [teacherId], references: [id])
  title       String
  description String
  dueDate     DateTime
  createdAt   DateTime @default(now())

  @@index([batchId])
}

// ---------- Resources & Results ----------

model Resource {
  id            String       @id @default(uuid())
  title         String
  courseName    String
  semesterLabel String // e.g. "4th Year 2nd Semester"
  year          Int
  type          ResourceType
  fileUrl       String
  fileSizeBytes Int
  uploaderId    String
  uploader      User         @relation("ResourceUploader", fields: [uploaderId], references: [id])
  downloadCount Int          @default(0)
  createdAt     DateTime     @default(now())

  @@index([year, semesterLabel])
}

model Result {
  id           String   @id @default(uuid())
  batchId      String
  batch        Batch    @relation(fields: [batchId], references: [id])
  semesterId   String
  semester     Semester @relation(fields: [semesterId], references: [id])
  studentId    String
  student      User     @relation("StudentResults", fields: [studentId], references: [id])
  universityId String
  courseMarks  Json // [{ courseCode, marks/grade }]
  gpa          Float?
  cgpa         Float?
  uploadedById String
  uploadedBy   User     @relation("ResultUploader", fields: [uploadedById], references: [id])
  publishedAt  DateTime @default(now())

  @@index([batchId, semesterId])
  @@index([studentId])
}

// ---------- Operations ----------

model PromotionRequest {
  id            String          @id @default(uuid())
  batchId       String
  batch         Batch           @relation(fields: [batchId], references: [id])
  semesterId    String
  semester      Semester        @relation(fields: [semesterId], references: [id])
  requestedById String
  requestedBy   User            @relation("PromotionRequestedBy", fields: [requestedById], references: [id])
  status        PromotionStatus @default(PENDING)
  reason        String?
  reviewedById  String?
  reviewedBy    User?           @relation("PromotionReviewedBy", fields: [reviewedById], references: [id])
  reviewedAt    DateTime?
  createdAt     DateTime        @default(now())

  @@index([status])
}

model Notification {
  id                String   @id @default(uuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  message           String
  relatedEntityType String?
  relatedEntityId   String?
  isRead            Boolean  @default(false)
  createdAt         DateTime @default(now())

  @@index([userId, isRead])
}

model AuditLog {
  id         String   @id @default(uuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  action     String
  entityType String
  entityId   String
  ipAddress  String
  details    Json?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([entityType, entityId])
}
```

### 4.9 Indexing Strategy

The schema above already has these baked in as `@@index`; listed here separately because each one maps to a specific requirement, not just "seems reasonable":

| Index                                    | Table         | Why                                                                                                                                                            |
| ---------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `(roomId, date)`                         | ScheduleEntry | Room conflict check — FR-14, target ≤200ms (NFR-04)                                                                                                            |
| `(teacherId, date)`                      | ScheduleEntry | Teacher conflict check — same requirement                                                                                                                      |
| `(batchId, date)`                        | ScheduleEntry | Batch conflict check, plus every "my schedule" query (FR-11, FR-12)                                                                                            |
| `(batchId, status)`                      | Semester      | Finding a batch's active semester without a table scan                                                                                                         |
| `(userId, isRead)`                       | Notification  | Unread badge count, checked on most page loads (FR-31)                                                                                                         |
| `(entityType, entityId)`                 | AuditLog      | Pulling audit history for one record (NFR-12)                                                                                                                  |
| `@@unique([scheduleEntryId, studentId])` | CTMark        | Not a performance index — a correctness constraint. Makes "one mark per student per CT" (FR-20) impossible to violate even if a service-layer check is missed. |

## 5. Authentication & Authorization

Middleware pipeline, in order, for any protected route:

```
requestId → rateLimiter (auth routes only) → authenticate (verify JWT) → authorize(...roles) → ownershipCheck? → controller
```

| Requirement                          | Implementation                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password hashing (NFR-06)            | bcrypt, cost factor ≥ 10                                                                                                                                                  |
| JWT (NFR-08)                         | Access token, 24h expiry, 256-bit secret. Refresh token stored hashed in `RefreshToken`, revocable, rotated on use.                                                       |
| Account lockout (FR-03)              | 5 failed logins → 15-minute lock, tracked via a `failedAttempts` / `lockedUntil` pair on `User`.                                                                          |
| RBAC (NFR-07)                        | `authorize('ADMIN')`, `authorize('TEACHER', 'ADMIN')` etc. as route-level middleware, checked against `User.role`.                                                        |
| Ownership checks (R-02)              | Separate middleware for routes like "cancel my class" — confirms `ScheduleEntry.teacherId === req.user.id` before the controller runs, independent of the role check.     |
| Chairman-only actions (C-07)         | Same pattern as ownership checks — `requireChairman` middleware for seminar/workshop allocation, checked in addition to `authorize('TEACHER')`.                           |
| Email verification (FR-02)           | Account created `isVerified: false`; verification link token stored with 24h expiry. Unverified accounts older than 7 days are purged by a scheduled job, not on request. |
| Password change/reset (FR-04, FR-05) | Both invalidate all existing refresh tokens for the user, forcing re-login everywhere.                                                                                    |

## 6. Background Jobs

Kept in-process with `node-cron` rather than a separate worker/queue service — at ~500 students + 31 teachers, there's no throughput case for a message broker yet, and it avoids standing up infrastructure the project doesn't need (Redis, a queue, a worker deployment). If usage ever outgrows a single process, these are small enough to lift into a real job runner later without redesigning them.

| Job                          | Schedule           | Does                                                                                            |
| ---------------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| Purge unverified accounts    | Hourly             | Deletes `User` rows unverified for >7 days (FR-02)                                              |
| Archive cleanup              | Daily              | Permanently deletes `Semester` rows (and cascaded schedule data) archived >30 days ago (R-03)   |
| Past-due assignment flagging | On read, not a job | "Past Due" (FR-21) is a computed status (`dueDate < now()`), not a stored field — no job needed |

## 7. Conflict Detection Engine (FR-14, R-01, NFR-04)

This is the one part of the system that has to be both correct and fast (≤200ms per check), so it gets its own service rather than being inlined into controllers: `services/conflictService.ts`.

```ts
checkConflict({
  roomId, teacherId, batchId,
  date, startTime, endTime,
  excludeScheduleEntryId?,   // when checking an edit to an existing entry
}): Promise<ConflictResult>
```

It runs three overlap checks — room, teacher, batch — against `ScheduleEntry` for the same `date`, excluding cancelled/rescheduled-away rows and the entry being edited. Design choices that matter here:

- **Indexes**: composite indexes on `(roomId, date)`, `(teacherId, date)`, `(batchId, date)` so each check is an index range scan, not a table scan — this is what makes the NFR-04 target realistic.
- **Row locking, not just a read check**: the check-then-insert has to happen inside one transaction with `SELECT ... FOR UPDATE` on the relevant rows, so two admins allocating the same room at the same moment can't both pass the check before either writes. This is exactly the kind of thing that's easier to get right with a direct `pg` query inside a Prisma `$transaction` than with pure ORM calls.
- **Database-level backstop (optional, worth considering later)**: a Postgres exclusion constraint (`EXCLUDE USING gist`) on `(room_id, tsrange(date+start_time, date+end_time))` would make double-booking impossible even if application logic has a bug. Flagging as a future hardening step rather than a v1 requirement — the app-level check plus row locking satisfies FR-14 on its own.
- **Reused everywhere**: routine generation, room allocation, class time/day changes, CT scheduling, and exam routine generation all call the same `checkConflict`, rather than each having its own overlap logic. One engine, several callers — consistent with FR-14 stating conflict detection "applies to all users who can modify schedules."

## 8. Notification System (FR-31)

Kept simple on purpose: a `Notification` row is written synchronously in the same service call that causes the event (e.g. `classService.cancelClass()` writes the cancellation _and_ inserts notifications for the batch's students in one transaction). No message queue — at this scale, a queue adds failure modes (retry logic, dead-letter handling) without a throughput problem to justify it.

| Event                         | Recipients                        |
| ----------------------------- | --------------------------------- |
| Class cancelled / rescheduled | Students of the batch             |
| CT scheduled / marks uploaded | Students of the batch             |
| Assignment created            | Students of the batch             |
| Promotion request submitted   | Admin                             |
| Batch promoted                | Students + CR of the batch        |
| Holiday declared              | All users                         |
| Resource uploaded             | Students of the relevant semester |
| Result published              | Students of the batch             |

## 9. API Surface

Grouped by module; role column shows who can call it (Student = any authenticated user including CR/Teacher/Admin unless narrower).

**Auth**

| Method | Path                            | Role          |
| ------ | ------------------------------- | ------------- |
| POST   | /api/auth/register              | Public        |
| GET    | /api/auth/verify-email/:token   | Public        |
| POST   | /api/auth/login                 | Public        |
| POST   | /api/auth/refresh               | Authenticated |
| POST   | /api/auth/change-password       | Authenticated |
| POST   | /api/auth/forgot-password       | Public        |
| POST   | /api/auth/reset-password/:token | Public        |

**Batch & Semester**

| Method | Path                       | Role  |
| ------ | -------------------------- | ----- |
| POST   | /api/semesters             | Admin |
| GET    | /api/semesters             | Admin |
| POST   | /api/promotions/request    | CR    |
| GET    | /api/promotions            | Admin |
| PATCH  | /api/promotions/:id        | Admin |
| PATCH  | /api/students/:id/semester | Admin |

**Routine & Rooms**

| Method | Path                                  | Role                |
| ------ | ------------------------------------- | ------------------- |
| POST   | /api/routines/generate                | Admin               |
| GET    | /api/routines/me                      | Student, Teacher    |
| GET    | /api/rooms/availability?date=&roomId= | Admin, Teacher      |
| POST   | /api/schedule-entries/:id/cancel      | Teacher (own class) |
| PATCH  | /api/schedule-entries/:id/time        | Teacher (own class) |
| PATCH  | /api/schedule-entries/:id/reschedule  | Teacher (own class) |

**Holidays**

| Method | Path              | Role                   |
| ------ | ----------------- | ---------------------- |
| POST   | /api/holidays     | Admin                  |
| DELETE | /api/holidays/:id | Admin                  |
| GET    | /api/holidays     | Public (authenticated) |

**CT & Assignments**

| Method        | Path                                    | Role                |
| ------------- | --------------------------------------- | ------------------- |
| POST          | /api/schedule-entries/:id/convert-to-ct | Teacher (own class) |
| POST          | /api/ct/:id/marks                       | Teacher             |
| GET           | /api/ct/marks/me                        | Student             |
| POST          | /api/assignments                        | Teacher             |
| GET           | /api/assignments                        | Student, Teacher    |
| PATCH, DELETE | /api/assignments/:id                    | Teacher (owner)     |

**Exams**

| Method | Path                   | Role             |
| ------ | ---------------------- | ---------------- |
| POST   | /api/exams/routine     | Admin            |
| PATCH  | /api/exams/routine/:id | Admin            |
| GET    | /api/exams/routine     | Student, Teacher |

**Resources & Results**

| Method        | Path               | Role              |
| ------------- | ------------------ | ----------------- |
| POST          | /api/resources     | CR                |
| GET           | /api/resources     | Public            |
| DELETE        | /api/resources/:id | CR (owner), Admin |
| POST          | /api/results       | CR                |
| GET           | /api/results       | Public            |
| PATCH, DELETE | /api/results/:id   | Admin             |

**Dashboards & Notifications**

| Method | Path                        | Role          |
| ------ | --------------------------- | ------------- |
| GET    | /api/dashboard/student      | Student       |
| GET    | /api/dashboard/teacher      | Teacher       |
| GET    | /api/dashboard/admin        | Admin         |
| GET    | /api/notifications          | Authenticated |
| PATCH  | /api/notifications/:id/read | Authenticated |

## 10. Error Handling & Validation

- A single `AppError` class (`statusCode`, `message`, `code`) thrown from services, caught by one centralized Express error-handling middleware at the end of the chain. No stack traces or internal details ever reach the client (NFR-15).
- Every error response has the same shape: `{ "error": { "code": "...", "message": "..." } }` — makes frontend error handling predictable.
- Request validation happens at the route boundary, before the controller runs, using Zod schemas per endpoint (suggested, not yet locked in — see §1). Keeps "is this input well-formed" separate from "is this business-valid," which stays in services.

## 11. Testing Strategy (recap)

Already decided; noting how it maps onto this structure specifically:

| Layer       | Tool                             | What's covered                                                                                                                           |
| ----------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `services/` | Vitest (unit)                    | Conflict detection, promotion rules, notification fan-out — pure logic, no HTTP                                                          |
| `routes/`   | Vitest + Supertest (integration) | Full request/response cycle against a real Postgres service container in CI                                                              |
| Concurrency | Vitest (integration)             | Two simultaneous conflicting booking requests — confirms the row-locking in §7 actually prevents double-booking, not just the happy path |

CI continues to use a Postgres service container (already decided) rather than a real Neon branch — faster, free, and fully isolated per run. Neon is a production/staging concern, not a CI one.

## 12. Documentation (TypeDoc)

TSDoc comments on services, controllers, and shared types generate a static reference site (`docs/`) via `typedoc.json` pointed at `src/`. This is a scope call worth being explicit about: TypeDoc documents the _codebase_ (functions, types, modules) — it's not an OpenAPI/Swagger contract for the REST API itself. Given there's a single frontend consuming this backend (not third-party API consumers), skipping a separate OpenAPI spec and relying on TypeDoc + the API table in §9 keeps documentation to one tool instead of two. If external API consumers ever become a real need, Swagger/OpenAPI generation is a clean addition later, not a rework.

## 13. Environment & Configuration

| Variable                                | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                          | Neon pooled connection string (app runtime)      |
<!-- | `DIRECT_URL`                            | Neon direct connection string (`prisma migrate`) | -->
| `JWT_SECRET` / `JWT_REFRESH_SECRET`     | ≥256-bit signing secrets                         |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | Verification & notification emails               |
| `PORT`                                  | Server port                                      |
| `NODE_ENV`                              | development / test / production                  |

## 14. Open Items

Carried over from §1 for visibility — not blockers, just decisions worth a quick confirm before implementation starts:

- Validation library: Zod suggested, not confirmed.
- `helmet` + `express-rate-limit`: reasonable defaults for NFR-10/NFR-11, not confirmed.
- Postgres exclusion constraint as a conflict-detection backstop (§7): worth doing, not required for v1.
