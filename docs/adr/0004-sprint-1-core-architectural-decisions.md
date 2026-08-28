# 0004. Sprint 1 Core Architectural Decisions

- **Status**: accepted
- **Deciders**: Engineering Team
- **Date**: 2026-08-27

## Context and Problem Statement

During architecture alignment for Sprint 1, key decisions were resolved regarding database test harness strategy, conflict self-exclusion during rescheduling, dual-format result storage, and Class Representative (CR) lifecycle on batch promotion.

## Decision Drivers

- Local developer simplicity without Docker overhead.
- Mathematical correctness in conflict detection without self-collision bugs.
- Granular individual student grade visibility combined with full batch document archives.
- Explicit security and accountability for elected CR roles across semester transitions.

## Decisions

### 1. Database Testing Strategy (No Docker Required)

- **Decision**: Avoid requiring Docker for local development and test runs. Testing harnesses connect directly to PostgreSQL instances or cloud Neon database branches via `TEST_DATABASE_URL` / `DATABASE_URL`.

### 2. Conflict Detection Self-Exclusion

- **Decision**: `conflictService.checkOverlap` must accept an optional `excludeEntryId` parameter. When updating or rescheduling an existing schedule entry, the current entry is excluded from overlap checks across rooms, teachers, and batches.

### 3. Dual-Hybrid Semester Result Storage

- **Decision**: CR semester final result upload implements a dual storage model:
  1. Tabular CSV/spreadsheet data is parsed into structured relational `Result` records (`gpa`, `cgpa`, `courseMarks` JSON) mapped to each student's `universityId` for personalized dashboard access.
  2. The original raw result document/PDF is archived under the `Resource` repository for batch-wide download.

### 4. CR Role Reset on Batch Promotion

- **Decision**: When an Admin initiates a batch-wide semester promotion, all active `CR` accounts within that batch are automatically reset to `STUDENT` role. Faculty or Department Admins must explicitly assign/confirm the CR for the new semester.

## Consequences

- Simplifies local testing setup for all team members.
- Prevents false conflict rejections during interactive drag-and-drop or slot rescheduling.
- Provides rich per-student analytics while maintaining historical department grade sheets.
- Ensures CR access permissions do not unintentionally linger across academic years.
