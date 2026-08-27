# 0005. Email Delivery, CT Marks Aggregation, and Assignment Submissions

- **Status**: accepted
- **Deciders**: Engineering Team
- **Date**: 2026-08-27

## Context and Problem Statement

To finalize the specifications for Sprint 1, decisions were required for local email delivery during testing, CT marks aggregation policies in JU CSE, and student assignment submission modalities.

## Decision Drivers

- Frictionless local testing and offline CI execution without mandatory external SMTP services.
- Accurate reflection of CSE departmental grading conventions with flexibility for faculty.
- Support for varied assignment deliverables (programming repositories vs PDF reports).

## Decisions

### 1. Zero-Friction Email Transport Service

- **Decision**: The email service implements an adapter pattern. In `NODE_ENV=development` or `NODE_ENV=test`, verification links and password reset OTPs/tokens are logged directly to the server console and returned in test fixtures. When SMTP environment variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) are configured, the service routes through the real SMTP transport (Nodemailer/Resend).

### 2. Configurable CT Marks Aggregation Policy

- **Decision**: Courses support a configurable CT marks aggregation policy:
  - `BEST_3_OF_4` (JU CSE Departmental Default)
  - `AVERAGE_ALL`
  - `BEST_2_OF_3`
  - `BEST_N_OF_M`
    The marks calculation engine dynamically computes the student's continuous assessment score based on the policy configured on the course.

### 3. Dual-Mode Assignment Submissions

- **Decision**: Assignment submissions support both external link submissions (e.g. GitHub repository URL, Google Drive link) and direct document attachments (PDF, DOCX, ZIP).

## Consequences

- Developers and AI agents can execute full registration and password reset test suites locally without mock SMTP servers.
- Faculty have flexibility to adjust CT weightage according to course syllabus.
- Students can easily submit programming assignments via repository links or written reports via file uploads.
