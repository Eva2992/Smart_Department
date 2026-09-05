# 8. TypeDoc Documentation Standard and API Specification Generation

Date: 2026-09-04

## Status

Accepted

## Context

As the Smart Department platform grows across multiple bounded contexts (Identity, Academic Catalog, Routine & Conflict Engine, Assessments, and Resource Management), maintaining accurate, up-to-date, and readable API documentation is essential for maintainability and seamless collaboration between autonomous engineering agents and human developers.

Traditional documentation workflows suffer from two primary failure modes:

1. **Type Drift**: Manually written JSDoc annotations (e.g. `@param {string} userId`) frequently diverge from actual TypeScript types as code evolves.
2. **Duplication Overhead**: Writing type annotations twice (in TypeScript interfaces and in comment blocks) slows development and creates clutter.

[`docs/documentation.md`](../documentation.md) establishes a comprehensive guide for TypeDoc. We require a formalized architectural standard for generating, verifying, and enforcing documentation across all engineering sprints.

## Decision

1. **Adopt TypeDoc for Source Code Documentation**:
   - We adopt **TypeDoc** as the standard documentation generator for the TypeScript codebase (`server/`).
   - TypeDoc directly integrates with the TypeScript compiler (`tsc`) AST, extracting exact types, signatures, interfaces, and class hierarchies directly from code without duplicating type information inside JSDoc comments.

2. **Standard Tag Syntax & Comment Conventions**:
   - All public services, controllers, utilities, interfaces, and types must be documented using JSDoc block syntax (`/** ... */`).
   - Standard block tags:
     - `@param <name> - <description>`: For input parameters (without redundant `{type}`).
     - `@returns <description>`: For return values.
     - `@throws {ErrorType} <description>`: For expected domain and runtime errors.
     - `@example`: Functional usage snippets formatted in markdown code blocks.
     - `{@link TargetSymbol}`: Inline cross-references linking related services, models, and interfaces.
   - Visibility modifiers (`public`, `protected`, `private`) and `@abstract` must be properly maintained and parsed according to `server/typedoc.json`.

3. **Output & Artifact Isolation**:
   - Documentation is generated to `server/docs/api`.
   - The generated output directory is gitignored (`server/docs/`) to prevent committing generated HTML, CSS, and search index assets to version control.

4. **Standardized Scripts**:
   - In `server/package.json`: `"build:docs": "typedoc"` and `"docs": "typedoc"`.
   - In root `package.json`: `"build:docs": "npm run build:docs --prefix server"`.
   - Local watch command: `"docs:watch": "typedoc --watch"`.

5. **CI Quality Gate Enforcement**:
   - `npm run build:docs` is incorporated into the CI verification checklist alongside `npm test`, `npx tsc --noEmit`, and `npm run build`.
   - Documentation compilation must pass cleanly without TypeScript compiler or AST extraction failures.

## Consequences

### Positive

- **Single Source of Truth**: TypeScript code is the sole authority for types; comments focus purely on _behavior_, _intent_, and _edge cases_.
- **Interactive Searchable Portal**: Generates a fast, search-indexed documentation site for all services, schemas, and routes.
- **Automated Verification**: Broken symbol links (`{@link}`) or invalid TypeScript constructs fail the doc build before merging.

### Negative / Trade-offs

- Adds a documentation build step to the CI pipeline.
- Requires contributors and autonomous agents to maintain disciplined JSDoc block annotations on all exported interfaces, services, and methods.
