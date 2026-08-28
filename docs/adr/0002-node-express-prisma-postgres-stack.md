# 0002. Full-Stack TypeScript Architecture with Express, Prisma, and PostgreSQL

- **Status**: accepted
- **Deciders**: Engineering Team
- **Date**: 2026-08-27

## Context and Problem Statement

Smart_Schedular requires a robust, type-safe, maintainable backend and frontend stack capable of handling relational academic schedules, role-based access control, high concurrency conflict detection, and real-time updates.

## Decision Drivers

- End-to-end TypeScript type safety between client, server, and database.
- Proven relational integrity and transactional capabilities for complex schedule allocations.
- Rapid developer velocity and strong testing tooling (Vitest, Supertest).

## Considered Options

- Python / Django / FastAPI with PostgreSQL.
- Node.js / Express.js / TypeScript with Prisma ORM and PostgreSQL on Neon.
- Go with Gin / GORM.

## Decision Outcome

Chosen option: "Node.js / Express.js / TypeScript with Prisma ORM and PostgreSQL (Neon)", with React + Vite on the client.

### Stack Details

- **Backend Runtime & Framework**: Node.js (LTS), Express.js in TypeScript strict mode.
- **ORM & DB Driver**: Prisma with `@prisma/adapter-pg` over TCP connection to Neon PostgreSQL (pooled connection for app server, direct connection for migrations).
- **Architecture Pattern**: Layered MVC (thin controllers, domain services, repository/Prisma models).
- **Auth**: JWT (short-lived access tokens + hashed revocable refresh tokens) with RBAC middleware.
- **Testing**: Vitest + Supertest.

### Positive Consequences

- Shared TypeScript types across layers reduce contract drift.
- Prisma provides automated migration generation and type-safe query building.
- Vitest provides fast unit and integration testing.

### Negative Consequences

- High-contention transactional operations (like multi-slot locking) require deliberate raw SQL transactions alongside Prisma.
