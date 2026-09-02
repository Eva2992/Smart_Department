# 7. Rebrand to Smart Department and Scope Expansion

Date: 2026-09-03

## Status
Accepted

## Context
The project was initially conceived as "Smart Schedular", focused on routine timetabling and 3-way conflict detection for classrooms, teachers, and batches. Over successive iterations, the platform expanded into a comprehensive academic operations system for the Department of Computer Science and Engineering (CSE) at Jahangirnagar University (JU). It now encompasses:
- Identity and Access Management with preloaded roster verification for students and faculty.
- Master routines, daily instance tracking, room availability matrices, and seminar bookings.
- Continuous assessment management (CT scheduling, policy-based score aggregation, and assignments).
- Final examination routines and conflict validation.
- Centralized study resource distribution and dual-hybrid semester final result publication.
- Batch promotion workflows and CR leadership lifecycle management.

Retaining the name "Smart Schedular" led to a mismatch between ubiquitous language, branding, repository identity, and actual system capabilities.

## Decision
1. **Canonical Product Name**: Formally adopt **Smart Department** (official title: **JU CSE Smart Department**) as the ubiquitous product name across domain specifications, frontend UI, backend services, and repository metadata.
2. **Sub-Domain Demarcation**: The "Routine & Conflict Detection Engine" remains an essential core bounded context within the overarching Smart Department architecture rather than the defining identity of the entire system.
3. **Ubiquitous Language Hygiene**: Deprecate "Smart Schedular" and "Smart Scheduler", listing them explicitly under `_Avoid_` in `CONTEXT.md`.
4. **Visual Identity Integration**: Adopt the unified 4-node system arc (`smart-department-icon.svg`) representing the four collaborative roles (Student, CR, Teacher, Admin) as the official icon/favicon, and the full wordmark (`smart-department-logo.svg`) across application headers and authentication entrypoints.
5. **Infrastructure Alignment**: Update package manifests, documentation, health endpoint assertions, and repository URLs to `Smart_Department`.

## Consequences
- Unifies product identity with the full breadth of departmental operations.
- Clarifies bounded context boundaries: scheduling is a specialized engine within a broader departmental operating platform.
- Provides consistent, accessible, and responsive visual branding across all user-facing touchpoints.
