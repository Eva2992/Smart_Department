# 0003. Three-Way Transactional Conflict Detection Engine

- **Status**: accepted
- **Deciders**: Engineering Team
- **Date**: 2026-08-27

## Context and Problem Statement

In academic scheduling for the JU CSE department, double bookings and scheduling clashes are the primary operational failure mode. The system must guarantee that no scheduling conflict occurs across rooms, teachers, or student batches, even under concurrent booking requests.

## Decision Drivers

- Strict mathematical correctness: Zero overlapping time intervals for the same room, teacher, or batch.
- Concurrency protection: Race conditions during simultaneous schedule updates must be rejected cleanly.
- Performance: Fast conflict evaluation during interactive drag-and-drop or routine creation in UI.

## Considered Options

- In-memory conflict checking before database write.
- Application-level check wrapped in database serializable transaction / `SELECT ... FOR UPDATE` row locks.
- Database GiST exclusion constraints (`btree_gist` with `tsrange`).

## Decision Outcome

Chosen option: "Application-level conflict service with database transaction locks and indexed interval queries".

### Conflict Rules

A proposed slot `[start_new, end_new]` overlaps with existing slot `[start_exist, end_exist]` if:
`start_new < end_exist AND end_new > start_exist`

The check evaluates:

1. **Room Conflict**: Same `roomId` on the same date/day with overlapping time.
2. **Teacher Conflict**: Same `teacherId` on the same date/day with overlapping time.
3. **Batch Conflict**: Same `batchId` on the same date/day with overlapping time.

### Positive Consequences

- ACID guarantees prevent race condition overlaps.
- Informative conflict payload returns the exact entity causing the conflict (e.g. "Teacher Dr. X is already booked in R-101 for CSE 301").

### Negative Consequences

- Requires transaction overhead for multi-slot updates.
