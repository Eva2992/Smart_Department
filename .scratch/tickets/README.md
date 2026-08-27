# Local Tickets Tracker

This directory serves as the local fallback issue tracker when operating without direct GitHub API access or when developing offline.

## Ticket Format

Each ticket is a markdown file: `.scratch/tickets/<ticket-number>-<slug>.md`

```markdown
---
id: "T-001"
title: "Implement 3-way conflict detection service"
category: "enhancement" # bug | enhancement | refactor | documentation
state: "ready-for-agent" # needs-triage | needs-info | ready-for-agent | ready-for-human | in-progress | wontfix
blocks: []
blocked-by: []
---

## Summary
Brief description of the tracer-bullet task.

## Scope & Changes
- [ ] Database / Prisma query
- [ ] Service logic in `server/src/services/`
- [ ] Unit tests in `server/tests/unit/`

## Acceptance Criteria
- [ ] Zero false negatives in time overlap calculations.
- [ ] All unit tests pass with Vitest.
```
