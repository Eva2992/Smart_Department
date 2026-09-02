# Agent Development Guidelines

This repository is configured for autonomous engineering agents operating with the **Matt Pocock Engineering Skills Suite**.

---

## 1. Domain & Architecture Source of Truth

- **Ubiquitous Language & Domain Concepts**: [`CONTEXT.md`](file:///CONTEXT.md)
- **Architecture Decision Records**: [`docs/adr/`](file:///docs/adr/)
- **Software Requirements Specification**: [`docs/srs.md`](file:///docs/srs.md)
- **Backend Architecture & Design**: [`docs/backend_design.md`](file:///docs/backend_design.md)
- **Frontend Design System & Color Palette**: [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

Agents MUST consult [`CONTEXT.md`](file:///CONTEXT.md) and [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md) before naming variables, models, routes, writing specifications, or implementing UI components to preserve ubiquitous terminology and visual consistency.

---

## 2. Issue Tracking & Workflow Automation

### Tracker Configuration

- **Primary Tracker**: GitHub Issues (`gh issue` CLI / GitHub API)
  - Remote repository: `https://github.com/Eva2992/Smart_Department.git`
- **Fallback / Local Tracker**: `.scratch/tickets/`
  - When offline or working locally without GitHub credentials, store tickets as numbered markdown files (e.g., `.scratch/tickets/001-auth-flow.md`).

### Triage State Machine & Label Vocabulary

| Label / State     | Description                                                               | Next Steps                       |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------- |
| `needs-triage`    | Newly created item awaiting evaluation                                    | Agent or human runs `/triage`    |
| `needs-info`      | Missing reproduction steps, mockups, or context                           | Awaits clarification from author |
| `ready-for-agent` | Unambiguously specified, vertical tracer bullet ready for agent execution | Eligible for `/implement`        |
| `ready-for-human` | Requires manual review, credentials, physical hardware, or human decision | Human action required            |
| `in-progress`     | Active development underway                                               | Ticket branch active             |
| `wontfix`         | Out of scope or rejected                                                  | Ticket closed with rationale     |

---

## 3. Engineering Skills & Slash Commands

| Skill / Command    | Purpose                                                                            | When to use                                          |
| ------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `/to-spec`         | Turn conversation / plan into a formal technical spec with test seams              | After requirements alignment                         |
| `/to-tickets`      | Slice a spec into context-window-sized tracer-bullet tickets with dependency edges | Before starting implementation                       |
| `/triage`          | Evaluate, clarify, and label incoming issues                                       | When processing backlog                              |
| `/implement`       | Implement a spec or ticket end-to-end                                              | When executing a `ready-for-agent` task              |
| `/tdd`             | Test-Driven Development (Red-Green-Refactor)                                       | For all logic, controllers, services, and components |
| `/code-review`     | Dual-axis review (Standards + Spec)                                                | Prior to merging PR or finishing task                |
| `/domain-modeling` | Update ubiquitous language and write ADRs                                          | When adding/modifying domain entities                |
| `/overhaul`        | Clean architectural refactoring & tech debt cleanup                                | When modernizing legacy modules                      |
| `/grill-with-docs` | Interactively stress-test a proposed design against docs and ADRs                  | Before finalizing complex architecture               |

---

## 4. Continuous Integration (CI) & Quality Gates

On every push and pull request, the CI pipeline enforces strict verification:

1. **Install Dependencies**: `npm ci`
2. **Format Check**: `npx prettier --check .` (catches unformatted code)
3. **Type Check**: `tsc --noEmit` / `npm run typecheck` (strict mode in `server/` and `client/`)
4. **Tests**:
   - Backend unit tests (Vitest) + Integration tests (Vitest + Supertest against a PostgreSQL test database container)
   - Frontend unit tests (Vitest) + Component integration tests (Vitest + React Testing Library)
5. **Quality Gate Rule**: If any check fails, the PR is **strictly blocked from merging**.

### Testing Strategy Matrix

| Layer                          | Unit Testing | Integration Testing            |
| ------------------------------ | ------------ | ------------------------------ |
| **Backend (Express + Prisma)** | Vitest       | Vitest + Supertest (test DB)   |
| **Frontend (React)**           | Vitest       | Vitest + React Testing Library |

### Verification Commands

- **Backend (`server/`)**: `npm test` (Vitest) && `npx tsc --noEmit` && `npm run prisma:validate` && `npm run build`
- **Frontend (`client/`)**: `npm test` (Vitest) && `npm run typecheck` && `npm run lint` && `npm run build`

---

## 5. Implementation Rules

1. **Vertical Tracer Bullets**: Implement features end-to-end (Database schema -> Service -> Controller/Route -> Tests -> UI Component).
2. **Defensive Scheduling**: All schedule changes must be validated through the conflict detection engine before persisting.
3. **Thin Controllers, Pure Services**: Business logic belongs in `services/`, never in Express controllers.
4. **Design System Fidelity**: All UI elements must use CSS variables and tokens from [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md).
