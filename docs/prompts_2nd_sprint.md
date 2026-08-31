# Sprint 2 Engineering Prompts (Matt Pocock Skills Suite)

This document contains standardized, copy-pasteable autonomous agent prompts for **Sprint 2** of the **Smart_Schedular (JU CSE Academic Management System)** project.

Sprint 2 picks up where Sprint 1 left off. Sprint 1 delivered the foundational scaffold, authentication (signup, login, email verification, password management), batch & semester lifecycle, conflict detection engine, class rescheduling/cancellation, result generation, and CT & assignment scheduling.

Sprint 2 completes the remaining feature surface: resource sharing, classroom allocation, master routine management, holiday management, final exam routines, role-wise dashboards with notification system, and patches any gaps left over from Sprint 1.

Each prompt follows the **Matt Pocock Engineering Skills Suite** workflow:

```
/grill-with-docs → /to-spec → /to-tickets → /implement (with /tdd) → /code-review
```

---

## 🛡️ Continuous Integration (CI) Quality Gates

On every push and pull request, the CI pipeline enforces strict verification:

1. **Install Dependencies**: `npm ci` across root, `server/`, and `client/`.
2. **Format Check**: `npx prettier --check .` to catch unformatted code.
3. **Type Check**: `tsc --noEmit` / `npm run typecheck` (TypeScript strict mode in both `server/` and `client/`).
4. **Automated Testing Suite**:
   - Backend unit tests via Vitest.
   - Backend integration tests via Supertest against an isolated PostgreSQL service container.
   - Frontend unit and component integration tests via Vitest and React Testing Library.
5. **Quality Gate Rule**: If any check fails, the pull request is **strictly blocked from merging** until resolved.

---

## 🧪 Testing Strategy Matrix

| Layer                          | Unit Testing                | Integration Testing                                    |
| ------------------------------ | --------------------------- | ------------------------------------------------------ |
| **Backend (Express + Prisma)** | Vitest (`tests/unit/`)      | Vitest + Supertest with test DB (`tests/integration/`) |
| **Frontend (React + Vite)**    | Vitest (`src/**/*.test.ts`) | Vitest + React Testing Library (`src/**/*.test.tsx`)   |

---

## 🎨 Frontend Design System & Color Palette

All UI components MUST adhere strictly to the design tokens defined in [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md):

### 1. Core Palette

- **Primary (`--color-primary`)**: Crimson Red `#DC143C` (Dark `#B01030`) — Primary CTAs, active navigation items, active tab indicators, links, Admin accents, progress bars.
- **Secondary (`--color-secondary`)**: Warm Orange `#DA532C` — Class Representative (CR) role tags, CT session badges, secondary highlights.
- **Success (`--color-success`)**: Emerald Green `#16A34A` — Verified accounts, approved promotions, completed/active indicators.
- **Error (`--color-error`)**: Rose Red `#E11D48` — Room/time conflicts, cancelled classes, validation errors, locked accounts.
- **Gold / Amber (`--color-gold`)**: Amber `#F59E0B` — Holiday markers, rescheduled indicators, pending-review flags.
- **Background (`--color-bg`)**: Warm off-white `#FFFBFA` — Main application canvas.
- **Surface (`--color-surface`)**: Pure white `#FFFFFF` — Cards, modals, and panels.

### 2. Status & State Indicators

- **Scheduled**: Neutral gray `#F3F4F6` background with `#374151` text.
- **Cancelled**: Rose Red `#E11D48` text / tinted badge.
- **Rescheduled**: Amber `#F59E0B` text / tinted badge.
- **CT Session**: Warm Orange `#DA532C` badge.
- **Holiday (No Class)**: Amber `#F59E0B` badge.
- **Approved / Verified**: Emerald Green `#16A34A` badge.
- **Room / Time Conflict**: Rose Red `#E11D48` alert banner.

### 3. Role Badges

- **Student**: Neutral Slate Gray `#6B7280`
- **Class Representative (CR)**: Warm Orange `#DA532C`
- **Teacher**: Charcoal `#1F2937`
- **Admin**: Crimson Red `#DC143C`

### 4. Surface & Typography Tokens

- **Card Radius**: `16px` (`--radius-md`) to `20px` (`--radius-lg`).
- **Elevation / Shadow**: Soft elevation `0 4px 12px rgba(0, 0, 0, 0.06)` (`--shadow-soft`) — paired with soft shadows, **never hard borders**.
- **Headings**: `Poppins`, sans-serif (bold / semibold).
- **Body / UI Text**: `Inter`, sans-serif (regular / medium).

---

## Table of Contents

1. [Member 1: Resource Sharing (Resource Upload by CR & Resource Page)](#member-1-resource-sharing-resource-upload-by-cr--resource-page-public)
2. [Member 2: Classroom & Resource Allocation](#member-2-classroom--resource-allocation)
3. [Member 3: Master Routine Management](#member-3-master-routine-management)
4. [Member 4: Holiday & Off-Day Management](#member-4-holiday--off-day-management)
5. [Member 5: Final Exam Routine Management](#member-5-final-exam-routine-management)
6. [Member 6: Schedule Dashboard & Notification System](#member-6-schedule-dashboard--notification-system)
7. [Sprint Completion: Gap Closure & Integration Polish](#sprint-completion-gap-closure--integration-polish)

---

## Member 1: Resource Sharing (Resource Upload by CR & Resource Page (Public))

> **Assigned to:** Member 1  
> **Target Modules:** CR Resource Upload, Public Resource Browsing & Download, Resource Management  
> **SRS Requirements:** `FR-23` (Resource Upload by CR), `FR-24` (Resource Page — Public), `CN-02` (CR Need: Resource Upload), `SN-06` (Student Need: Resource Download)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L735), [`docs/backend_design.md`](file:///docs/backend_design.md#L458), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the Resource Sharing module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for CR study resource uploading (PDF, DOCX, PPTX, images) with metadata tagging (course, semester, year, resource type), a public-facing Resource Page with hierarchical browsing (Year → Semester → Course → Type), download tracking, search & filtering, and Admin/CR resource deletion.

### Existing Implementation Context

Sprint 1 already delivered:
- `Resource` Prisma model with fields: `id`, `title`, `courseName`, `semesterLabel`, `year`, `type` (NOTES/SLIDES/PAST_PAPER/OTHER), `fileUrl`, `fileSizeBytes`, `uploaderId`, `downloadCount`.
- API routes: `POST /api/resources` (CR), `GET /api/resources` (Public), `DELETE /api/resources/:id` (CR owner / Admin).
- No frontend pages or components exist yet for resource sharing.

Your task: Wire up the backend file upload pipeline (Multer or similar for multipart/form-data), implement the resource service with validation (file size limit 50MB, supported formats), build the full frontend UI, and add comprehensive tests.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `resourceService.uploadResource`, `resourceService.deleteResource`, `resourceService.incrementDownloadCount`, `resourceService.listResources` (with filtering).
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/resources` (multipart upload with metadata), `GET /api/resources?year=&semester=&course=&type=`, `GET /api/resources/:id/download`, `DELETE /api/resources/:id`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `ResourceUploadForm.test.tsx`, `ResourceBrowser.test.tsx`, `ResourceCard.test.tsx`, `ResourceSearchFilter.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- **Resource Page Canvas**: Warm off-white `#FFFBFA` background.
- **Resource Cards**: Pure white `#FFFFFF` surface with `16px` border-radius and soft shadow (`0 4px 12px rgba(0,0,0,0.06)`).
- **Uploader Badge**: CR role tag in Warm Orange `#DA532C`.
- **Resource Type Tags**:
  - Notes: Charcoal `#1F2937`.
  - Slides: Crimson Red `#DC143C`.
  - Past Paper: Amber `#F59E0B`.
  - Other: Slate Gray `#6B7280`.
- **Download Button**: Crimson Red `#DC143C` CTA (hover `#B01030`).
- **Download Counter**: Muted Slate Gray `#6B7280` text.
- **Search Bar & Filter Chips**: Active filter highlight in Crimson Red `#DC143C`.
- **Hierarchical Navigation (Year → Semester → Course)**: Breadcrumb-style with Crimson Red `#DC143C` active state.
- **File Upload Dropzone**: Dashed border in Slate Gray `#6B7280`, drag-active state border in Crimson Red `#DC143C` with light tinted background.
- **Upload Progress Bar**: Crimson Red `#DC143C`.
- **Typography**: Poppins bold for resource titles and section headings, Inter for metadata labels and descriptions.

### Domain Rules (from CONTEXT.md and docs/srs.md)

1. **CR Upload Authorization (`FR-23`)**:
   - Only authenticated CRs can upload resources.
   - Required metadata per upload: title, course name, semester label, year (integer), resource type (NOTES / SLIDES / PAST_PAPER / OTHER).
   - File size limit: **50 MB** per file.
   - Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG.
   - Validate MIME type server-side (do not trust client file extension alone).
2. **Public Resource Browsing (`FR-24`)**:
   - The Resource Page is **publicly accessible** (no login required).
   - Resources organized hierarchically: Year → Semester → Course → Resource Type.
   - Each entry shows: title, course name, semester, upload date, uploader (CR name), file size, download count.
   - Full-text search and filter by course name, semester, year, or resource type.
3. **Deletion Rules**:
   - CRs can delete resources they uploaded.
   - Admins can delete any resource.
   - Deleting a resource must also remove the physical file from storage.
4. **Download Tracking**:
   - Increment `downloadCount` atomically on each download request.
   - Downloads do not require authentication.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-23, FR-24), `docs/backend_design.md` §4.5, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical tracer-bullet slices:
   - Ticket 1: File upload middleware (Multer config, file storage adapter — local disk or cloud) + validation service (size, MIME type).
   - Ticket 2: `resourceService` CRUD with filtering, download tracking, and Vitest unit tests (`/tdd`).
   - Ticket 3: Express routes with CR authorization, file streaming endpoint, and Supertest integration tests.
   - Ticket 4: Client React UI — Public Resource Page (hierarchical browsing, search, filter, download), CR Resource Upload Form (drag-and-drop with progress bar, metadata form).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 2: Classroom & Resource Allocation

> **Assigned to:** Member 2  
> **Target Modules:** Room Availability Matrix, Room Allocation Management, Seminar/Workshop Booking (Chairman Only)  
> **SRS Requirements:** `FR-13` (Room Allocation), `FR-14` (Room Conflict Detection), `AN-05` (Classroom & Lab Resource Allocation), `TN-09` (Seminar/Workshop Allocation — Chairman Only), `C-07` (Chairman-Only Constraint)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L609), [`docs/backend_design.md`](file:///docs/backend_design.md#L108), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), [`docs/adr/0003-three-way-conflict-detection-engine.md`](file:///docs/adr/0003-three-way-conflict-detection-engine.md)

```markdown
You are an autonomous full-stack engineer implementing the Classroom & Resource Allocation module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for Admin room allocation management, a visual Room Availability Matrix showing all 8 departmental rooms' schedules across time slots, Chairman-only seminar/workshop booking with conflict checking, and room assignment UI for schedule creation and modification workflows.

### Existing Implementation Context

Sprint 1 already delivered:
- `Room` Prisma model seeded with 8 fixed rooms (R-101, R-102, R-103, R-201, R-203, R-302, R-105, R-202).
- `ScheduleEntry` model with `roomId` foreign key and composite index `(roomId, date)`.
- `conflictService.checkOverlap` performing 3-way conflict detection (Room, Teacher, Batch) with self-exclusion support.
- Basic route `GET /api/rooms/availability?date=&roomId=` and `room.controller.ts`.
- Frontend `RoomMatrix.tsx` component exists but needs completion and integration.

Your task: Build the full Admin room allocation dashboard with a visual availability matrix, enhance the room availability API for date-range queries, implement Chairman-only seminar/workshop allocation endpoints, and connect all room-related UI flows.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `roomService.getRoomAvailability`, `roomService.getAllRoomsSchedule`, `scheduleService.createSeminarEntry`, `conflictService.checkOverlap` (seminar-specific edge cases).
- **Backend Integration Seams (Vitest + Supertest)**: `GET /api/rooms/availability?date=&roomId=`, `GET /api/rooms/schedule?startDate=&endDate=`, `POST /api/schedule-entries/seminar` (Chairman only), `GET /api/rooms` (list all rooms).
- **Frontend Component Tests (Vitest + React Testing Library)**: `RoomAvailabilityMatrix.test.tsx`, `RoomSelector.test.tsx`, `SeminarBookingForm.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- **Room Availability Matrix**: Grid layout (rows = rooms, columns = time slots).
  - Available Slot: Neutral gray `#F3F4F6` background.
  - Occupied (Class): Charcoal `#1F2937` text on light gray.
  - Occupied (CT): Warm Orange `#DA532C` badge.
  - Occupied (Exam): Crimson Red `#DC143C` badge.
  - Occupied (Seminar/Workshop): Amber `#F59E0B` badge.
  - Conflict Alert (attempted double-booking): Rose Red `#E11D48` highlighted cell with tooltip.
- **Room Cards**: Pure white `#FFFFFF` surface with `16px` border-radius and soft shadow.
  - Room Type Label: Classroom → Charcoal `#1F2937`, Computer Lab → Crimson Red `#DC143C`, Electrical Lab → Amber `#F59E0B`, Multipurpose → Warm Orange `#DA532C`.
- **Seminar/Workshop Booking Form**: Admin/Chairman accent Crimson Red `#DC143C`.
  - Submit Button: Crimson Red `#DC143C` (hover `#B01030`).
  - Chairman-Only Gate: Display a locked icon with text "Only the Department Chairman can allocate seminars and workshops" for non-Chairman teachers.
- **Date Picker & Navigation**: Week-view navigation with Crimson Red `#DC143C` active day indicator.
- **Typography**: Poppins for room numbers and matrix headers, Inter for time slot labels and event details.

### Domain Rules (from CONTEXT.md, ADR-0003, and docs/srs.md)

1. **Fixed Room Pool (`C-02`)**:
   - 3 Classrooms: R-101, R-102, R-103.
   - 3 Computer Labs: R-201, R-203, R-302.
   - 1 Electrical Circuit Lab: R-105.
   - 1 Multipurpose Room: R-202.
2. **Room Allocation with Conflict Detection (`FR-13`, `FR-14`)**:
   - When creating or modifying any scheduled event, the admin selects a room from the pool.
   - The system blocks allocation if the room is already occupied at the requested date/time with descriptive error: "Room [R-XXX] is already allocated to [Event Name] from [Start Time] to [End Time] on [Date]."
   - Room availability matrix shows all rooms' schedules for a selected date, allowing visual identification of open slots.
3. **Chairman-Only Seminar/Workshop Allocation (`C-07`, `TN-09`)**:
   - Only the department Chairman (a Teacher with `isChairman: true`) can allocate rooms for seminars and workshops.
   - Seminars use `ScheduleEntry` with `type: SEMINAR` and nullable `courseId`.
   - Full 3-way conflict checking applies (room, teacher, batch if specified).
4. **Real-Time Conflict Feedback**:
   - Conflict detection operates in real-time as the user selects room + time slot.
   - Display detailed conflict messages specifying the conflicting event, room, teacher, or batch.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-13, FR-14, TN-09, C-07), `docs/adr/0003-three-way-conflict-detection-engine.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `roomService` with date-range availability queries and Vitest unit tests (`/tdd`).
   - Ticket 2: Chairman seminar/workshop booking endpoint with `requireChairman` middleware and Supertest integration tests.
   - Ticket 3: Enhanced room availability API with multi-room, multi-day grid data.
   - Ticket 4: Client React UI — Room Availability Matrix (visual grid), Room Selector dropdown with live availability check, Seminar Booking Form (Chairman-gated), and Room Allocation panel for Admin dashboard.
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 3: Master Routine Management

> **Assigned to:** Member 3  
> **Target Modules:** Weekly Routine Template Definition, Day-Wise Calendar Generation, Routine View (Student & Teacher), Admin Routine Adjustment  
> **SRS Requirements:** `FR-10` (Day-Wise Routine Generation), `FR-11` (Routine View — Student), `FR-12` (Routine View — Teacher), `AN-04` (Day-Wise Routine Generation), `C-09` (Academic Calendar Dependency)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L573), [`docs/backend_design.md`](file:///docs/backend_design.md#L108), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), [`docs/adr/0003-three-way-conflict-detection-engine.md`](file:///docs/adr/0003-three-way-conflict-detection-engine.md), [`docs/adr/0004-sprint-1-core-architectural-decisions.md`](file:///docs/adr/0004-sprint-1-core-architectural-decisions.md)

```markdown
You are an autonomous full-stack engineer implementing the Master Routine Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for Admin weekly routine template definition (Master Routine), automated day-wise calendar generation across the entire semester duration, personalized routine views for Students (single-batch calendar) and Teachers (multi-batch consolidated view), and Admin post-generation adjustment capabilities.

### Existing Implementation Context

Sprint 1 already delivered:
- `ScheduleEntry` model with all scheduling fields (type, status, courseId, batchId, teacherId, roomId, date, startTime, endTime).
- `scheduleService.ts` with class rescheduling and cancellation logic.
- `conflictService.ts` / `conflictService.checkOverlap` for 3-way conflict detection.
- Routes: `POST /api/routines/generate` (Admin), `GET /api/routines/me` (Student/Teacher).
- `routine.controller.ts` and `routine.routes.ts` exist but may need expansion.
- Frontend `ScheduleGrid.tsx` exists for daily schedule display but needs full calendar and multi-view expansion.

Your task: Build the Admin-facing Master Routine Template input interface, implement the semester-wide day-wise generation engine (replicating the weekly template across all weekdays in the semester date range, excluding holidays), build personalized calendar views for Students and Teachers, and enable Admin manual adjustments to individual generated entries.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `routineService.generateDayWiseSchedule`, `routineService.validateWeeklyTemplate`, `scheduleService.getStudentSchedule`, `scheduleService.getTeacherSchedule` (multi-batch aggregation).
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/routines/generate` (with weekly template payload), `GET /api/routines/me?startDate=&endDate=` (student view), `GET /api/routines/me?startDate=&endDate=` (teacher multi-batch), `PATCH /api/schedule-entries/:id` (admin adjustment).
- **Frontend Component Tests (Vitest + React Testing Library)**: `MasterRoutineEditor.test.tsx`, `CalendarView.test.tsx`, `TeacherMultiBatchView.test.tsx`, `RoutineGenerationWizard.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- **Master Routine Template Editor (Admin)**:
  - Weekly grid (rows = time slots, columns = days of the week).
  - Draggable course blocks for slot assignment.
  - Empty Slot: Neutral gray `#F3F4F6`.
  - Theory Class Block: Charcoal `#1F2937` text on white card.
  - Lab Session Block: Crimson Red `#DC143C` accent border.
  - Conflict Warning (real-time as blocks are placed): Rose Red `#E11D48` overlay with conflict description tooltip.
  - Generate Button (full semester): Crimson Red `#DC143C` CTA (hover `#B01030`).
- **Student Calendar View (`FR-11`)**:
  - Day-wise / week-wise toggle calendar.
  - Today highlight: Crimson Red `#DC143C` circle around date number.
  - Class Entry Card: Pure white `#FFFFFF` surface with soft shadow, showing course name, teacher name, room, time slot.
  - Status badges per session: Scheduled (gray), Cancelled (Rose Red), Rescheduled (Amber), CT (Warm Orange), Holiday (Amber banner).
- **Teacher Multi-Batch View (`FR-12`)**:
  - General Board: Consolidated upcoming classes across all batches, sorted chronologically.
  - Batch filter tabs with batch-specific schedule view.
  - Class count per batch per course displayed as stat counters.
  - Quick action buttons: Cancel, Reschedule, Schedule CT, Create Assignment — in Crimson Red `#DC143C`.
- **Typography**: Poppins for calendar headers, day names, batch labels; Inter for time slot details and course metadata.

### Domain Rules (from CONTEXT.md and docs/srs.md)

1. **Weekly Template Definition (`FR-10`, `AN-04`, `C-09`)**:
   - Admin inputs a weekly routine template specifying for each day of the week: course, teacher (by unique ID), room number, time slot (start time, end time), batch.
   - This is the **Master Routine** — the recurring baseline weekly timetable.
2. **Day-Wise Generation Engine**:
   - The system takes the semester's start date and end date, then generates individual `ScheduleEntry` rows for each weekday in the range by replicating the weekly template.
   - Pre-declared holidays (from `Holiday` table) are automatically excluded — no entries generated for holiday dates.
   - Fridays/Saturdays (university off-days) should be excluded by default (configurable).
   - Each generated entry runs through `conflictService.checkOverlap` before insertion.
3. **Personalized Views**:
   - **Student (`FR-11`)**: Sees only their own batch's schedule in calendar format. Each entry shows: course name, teacher name, room number, time slot. Navigate between days/weeks within the current semester.
   - **Teacher (`FR-12`)**: Sees all classes across all assigned batches in a general board. Can filter by specific batch. Dashboard shows class count per batch for the current semester.
4. **Admin Adjustment**:
   - After generation, Admin can manually adjust individual day entries (change room, time, or teacher) with conflict re-checking.
   - Adjustments are reflected immediately in all affected users' views.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-10, FR-11, FR-12, AN-04, C-09), `docs/adr/0003-three-way-conflict-detection-engine.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `routineService` — weekly template validation, date-range expansion with holiday exclusion, batch conflict batch-insert with Vitest unit tests (`/tdd`).
   - Ticket 2: Student and Teacher personalized query endpoints with pagination and Supertest integration tests.
   - Ticket 3: Admin adjustment endpoint with conflict re-checking and Supertest integration tests.
   - Ticket 4: Client React UI — Admin Master Routine Template Editor (weekly grid with drag-and-drop), Routine Generation Wizard (progress indicator during bulk insert), Student Calendar View (day/week toggle, today highlight, status badges), Teacher Multi-Batch View (general board, batch tabs, class count stats, quick actions).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 4: Holiday & Off-Day Management

> **Assigned to:** Member 4  
> **Target Modules:** Holiday Declaration, Holiday Calendar, Auto-Cancellation of Scheduled Classes, Holiday Removal & Class Restoration  
> **SRS Requirements:** `FR-18` (Holiday Declaration), `AN-08` (Holiday & Off-Day Management)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L671), [`docs/backend_design.md`](file:///docs/backend_design.md#L108), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the Holiday & Off-Day Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for Admin holiday declaration (date, reason, scope), automatic cancellation/flagging of all scheduled classes on declared holidays, holiday calendar view visible to all users, holiday removal with class restoration, and integration with the routine generation engine to exclude holidays during calendar expansion.

### Existing Implementation Context

Sprint 1 already delivered:
- `Holiday` Prisma model with fields: `id`, `date`, `reason`, `scope` (ALL / BATCH), `batchId?`, index on `(date)`.
- `holidayService.ts` with basic declaration and deletion logic.
- Routes: `POST /api/holidays` (Admin), `DELETE /api/holidays/:id` (Admin), `GET /api/holidays` (Public authenticated).
- `holiday.controller.ts` and `holiday.routes.ts` exist.
- Frontend `HolidayManager.tsx` component exists with basic CRUD.

Your task: Complete the holiday management system with auto-cancellation of overlapping schedule entries, class status restoration on holiday removal, batch-scoped vs all-batch holiday logic, a polished holiday calendar UI for all users, and integration with the routine generation engine.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `holidayService.declareHoliday` (with auto-cancellation), `holidayService.removeHoliday` (with class restoration), `holidayService.getHolidaysByDateRange`, `holidayService.isHolidayDate`.
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/holidays` (creates holiday + cancels overlapping classes), `DELETE /api/holidays/:id` (removes holiday + restores classes), `GET /api/holidays?startDate=&endDate=`, `GET /api/holidays/upcoming`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `HolidayCalendar.test.tsx`, `HolidayDeclarationForm.test.tsx`, `HolidayBanner.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- **Holiday Calendar View**:
  - Calendar overlay: Holiday dates highlighted with Amber `#F59E0B` background circle/pill.
  - Holiday Banner (full-width across routine column): Amber `#F59E0B` background with Charcoal `#1F2937` text displaying holiday name/reason.
  - Classes on holiday dates: Struck-through text with `CANCELLED_HOLIDAY` label in Rose Red `#E11D48`.
- **Holiday Declaration Form (Admin)**:
  - Card: Pure white `#FFFFFF` surface with `16px` border-radius and soft shadow.
  - Date Picker: Standard date input with Crimson Red `#DC143C` active date highlight.
  - Scope Selector: Toggle between "All Batches" (default) and "Specific Batch" (shows batch dropdown).
  - Declare Holiday Button: Crimson Red `#DC143C` CTA (hover `#B01030`).
  - Warning Callout (when classes will be affected): Amber `#F59E0B` alert banner: "X classes across Y batches will be automatically cancelled."
- **Holiday List (Admin Dashboard)**:
  - Table/card list of all declared holidays with date, reason, scope, action buttons (Remove).
  - Remove Button: Rose Red `#E11D48` outline/text with confirmation modal.
  - Restoration Confirmation Modal: "Removing this holiday will restore X previously cancelled classes. Proceed?"
- **Upcoming Holidays Widget (All Users)**:
  - Compact card list in dashboard sidebar showing next 5 holidays with date and reason.
  - Amber `#F59E0B` left-border accent on each holiday card.
- **Typography**: Poppins for holiday names and calendar date numbers, Inter for reasons and scope labels.

### Domain Rules (from CONTEXT.md and docs/srs.md)

1. **Holiday Declaration (`FR-18`, `AN-08`)**:
   - Admin specifies: date, reason/name (e.g., "Independence Day," "Eid-ul-Fitr," "University Foundation Day"), and scope (ALL batches or BATCH-specific).
   - **Auto-Cancellation**: When a holiday is declared, ALL `ScheduleEntry` rows matching that date (and batch, if scoped) that have status `SCHEDULED` are automatically set to status `HOLIDAY`.
   - This applies retroactively — if a holiday is declared after the routine has already been generated, the overlapping entries are still marked.
2. **Holiday Removal & Class Restoration**:
   - Admin can remove a previously declared holiday.
   - Upon removal, all `ScheduleEntry` rows on that date that were set to `HOLIDAY` status are restored to their original `SCHEDULED` status.
   - If a class was individually cancelled (not due to holiday) before the holiday was declared, it should NOT be restored.
3. **Routine Generation Integration**:
   - The day-wise routine generation engine must query the `Holiday` table and skip generating `ScheduleEntry` rows for any date that is a declared holiday.
   - Provide a utility function `holidayService.isHolidayDate(date, batchId?)` for use by the routine engine.
4. **Scope Rules**:
   - `scope: ALL` — holiday applies to every batch, every scheduled entry on that date.
   - `scope: BATCH` — holiday applies only to entries matching the specified `batchId`.
   - A date can have multiple batch-scoped holidays (e.g., different batches have different off-days).

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-18, AN-08), `docs/backend_design.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: Enhance `holidayService` — transactional auto-cancellation on declaration, transactional restoration on removal, date-range queries, and `isHolidayDate` utility. Vitest unit tests (`/tdd`).
   - Ticket 2: Express routes with Admin authorization, batch-scoped holiday logic, and Supertest integration tests.
   - Ticket 3: Client React UI — Holiday Calendar View (calendar overlay with amber highlights), Holiday Declaration Form (Admin), Holiday List with removal and restoration confirmation, Upcoming Holidays sidebar widget.
   - Ticket 4: Integration with routine generation engine (skip holiday dates during bulk generation).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 5: Final Exam Routine Management

> **Assigned to:** Member 5  
> **Target Modules:** Semester Final Exam Routine Generation, Exam Schedule View, Exam Conflict Detection  
> **SRS Requirements:** `FR-22` (Semester Final Exam Routine Generation), `AN-06` (Semester Final Exam Routine)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L722), [`docs/backend_design.md`](file:///docs/backend_design.md#L681), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), [`docs/adr/0003-three-way-conflict-detection-engine.md`](file:///docs/adr/0003-three-way-conflict-detection-engine.md)

```markdown
You are an autonomous full-stack engineer implementing the Final Exam Routine Management module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for Admin semester final exam routine creation (specifying courses, dates, time slots, rooms per exam), exam-specific conflict detection (no two exams for the same batch overlap, no room double-booking), exam routine publication visible to Students and Teachers in a dedicated "Exam Schedule" section, and Admin post-publication modification with conflict re-checking.

### Existing Implementation Context

Sprint 1 already delivered:
- `ScheduleEntry` model supports `type: EXAM` and `type: SEMINAR`.
- `conflictService.checkOverlap` supports all `ScheduleEntry` types including EXAM.
- Routes: `POST /api/exams/routine` (Admin), `PATCH /api/exams/routine/:id` (Admin), `GET /api/exams/routine` (Student/Teacher).
- No dedicated exam controller, service, or frontend pages exist yet.

Your task: Build the exam routine service, Admin exam routine creation interface, exam schedule viewing for Students and Teachers, and exam-specific conflict validation rules.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `examService.createExamRoutine`, `examService.updateExamEntry`, `examService.getExamSchedule`, `conflictService.checkOverlap` (exam-specific: same batch, same day, overlapping time).
- **Backend Integration Seams (Vitest + Supertest)**: `POST /api/exams/routine` (bulk create exam entries), `PATCH /api/exams/routine/:id` (modify with conflict re-check), `GET /api/exams/routine?batchId=&semesterId=`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `ExamRoutineEditor.test.tsx`, `ExamScheduleView.test.tsx`, `ExamConflictAlert.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

- **Exam Routine Editor (Admin)**:
  - Table/grid layout: rows = exam courses, columns = date, time slot, room.
  - Add Exam Row Button: Crimson Red `#DC143C`.
  - Room Selector: Dropdown showing only rooms available at the selected date/time (pre-filtered by `conflictService`).
  - Conflict Alert (inline): Rose Red `#E11D48` border + icon next to conflicting row with detailed tooltip: "Batch 52 already has an exam at this time" or "Room R-202 is already booked."
  - Publish/Save Button: Crimson Red `#DC143C` CTA (hover `#B01030`).
- **Exam Schedule View (Student & Teacher)**:
  - Dedicated "Exam Schedule" section/tab on dashboard.
  - Exam Cards: Pure white `#FFFFFF` surface with `16px` border-radius and soft shadow.
  - Card Content: Course name (Poppins bold), date, time slot, room number, assigned teacher.
  - Exam Date Badge: Crimson Red `#DC143C` date pill.
  - Countdown Indicator (days until exam): Amber `#F59E0B` for ≤7 days, Rose Red `#E11D48` for ≤2 days.
  - Completed/Past Exams: Slate Gray `#6B7280` muted text.
- **Admin Exam Overview Panel**:
  - Summary cards: total exams scheduled, batches covered, rooms utilized, flagged conflicts count.
  - Crimson Red `#DC143C` Admin accent on stat counters.
- **Typography**: Poppins for exam titles, date labels, stat counters; Inter for room details, time slots, course metadata.

### Domain Rules (from CONTEXT.md and docs/srs.md)

1. **Exam Routine Creation (`FR-22`, `AN-06`)**:
   - Admin creates the exam routine specifying per exam: batch, semester, course name, date, time slot (start time, end time), room.
   - Room assignment typically uses R-202 (Multipurpose Room) for exams, but other rooms may also be used.
   - `ScheduleEntry.type = EXAM` — uses the same unified schedule table.
2. **Exam Conflict Detection**:
   - No two exams for the **same batch** may overlap in time on the same date.
   - No room may be double-booked for exams (or any other event type).
   - Teacher conflict checking applies — a teacher cannot proctor two exams simultaneously.
   - Same 3-way `conflictService.checkOverlap` is used.
3. **Publication & Visibility**:
   - Once published, the exam routine is visible to all students of the affected batch and to assigned teachers.
   - Displayed in a dedicated "Exam Schedule" section on Student and Teacher dashboards.
4. **Post-Publication Modification**:
   - Admin can modify individual exam entries after publication.
   - All modifications re-run conflict checking before persistence.
   - Changes trigger notifications to affected students and teachers.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-22, AN-06), `docs/adr/0003-three-way-conflict-detection-engine.md`, and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `examService` — bulk creation of `ScheduleEntry` rows with `type: EXAM`, per-entry conflict checking, modification logic with Vitest unit tests (`/tdd`).
   - Ticket 2: Express routes for exam CRUD with Admin authorization and Supertest integration tests.
   - Ticket 3: Client React UI — Admin Exam Routine Editor (table-based input, live conflict validation, room pre-filtering, publish action), Student Exam Schedule View (card list with countdown badges), Teacher Exam Schedule View.
   - Ticket 4: Integration — exam modifications trigger notification fan-out to affected batch students and teachers.
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Member 6: Schedule Dashboard & Notification System

> **Assigned to:** Member 6  
> **Target Modules:** Student Dashboard (FR-28), Teacher Dashboard (FR-29), Admin Dashboard (FR-30), In-App Notification System (FR-31), Notification Bell & Panel  
> **SRS Requirements:** `FR-28` (Student Dashboard), `FR-29` (Teacher Dashboard), `FR-30` (Admin Dashboard), `FR-31` (In-App Notifications)  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md#L794), [`docs/backend_design.md`](file:///docs/backend_design.md#L609), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md)

```markdown
You are an autonomous full-stack engineer implementing the Schedule Dashboard & Notification System module for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Implement the complete vertical tracer bullet for three role-specific dashboards (Student, Teacher, Admin), an in-app notification engine that generates and delivers notifications for all key academic events, a notification bell with unread badge count, a notification panel with read/unread management, and integration of notification triggers into all existing service operations.

### Existing Implementation Context

Sprint 1 already delivered:
- `Notification` Prisma model with fields: `id`, `userId`, `type`, `message`, `relatedEntityType?`, `relatedEntityId?`, `isRead`, `createdAt`, index on `(userId, isRead)`.
- `AuditLog` Prisma model for operation tracking.
- Routes: `GET /api/dashboard/student`, `GET /api/dashboard/teacher`, `GET /api/dashboard/admin`, `GET /api/notifications`, `PATCH /api/notifications/:id/read`.
- Frontend `DashboardPage.tsx` exists with basic layout but needs role-specific expansion.
- Frontend `Navbar.tsx` exists but has no notification bell.
- Various services exist (schedule, holiday, CT, assignment, result, promotion) that should trigger notifications but may not yet.

Your task: Build out comprehensive role-specific dashboard UIs aggregating all relevant data, implement the notification service with fan-out logic, add notification triggers to all existing service operations, build the notification bell and panel UI, and wire everything end-to-end.

### Testing Strategy & Seams

- **Backend Unit Seams (Vitest)**: `notificationService.create`, `notificationService.createBulkForBatch`, `notificationService.getUnreadCount`, `notificationService.markAsRead`, `dashboardService.getStudentDashboard`, `dashboardService.getTeacherDashboard`, `dashboardService.getAdminDashboard`.
- **Backend Integration Seams (Vitest + Supertest)**: `GET /api/dashboard/student` (personalized aggregation), `GET /api/dashboard/teacher` (multi-batch), `GET /api/dashboard/admin` (system overview), `GET /api/notifications?page=&limit=`, `GET /api/notifications/unread-count`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/mark-all-read`.
- **Frontend Component Tests (Vitest + React Testing Library)**: `StudentDashboard.test.tsx`, `TeacherDashboard.test.tsx`, `AdminDashboard.test.tsx`, `NotificationBell.test.tsx`, `NotificationPanel.test.tsx`.

### UI & Design System Requirements

Adhere strictly to `docs/frontend_color_palate.md`:

#### Student Dashboard (`FR-28`)
- **Today's Schedule Section**: Card list of today's classes with time, room, course, teacher. Active/next class highlighted with Crimson Red `#DC143C` left-border accent.
- **Calendar View**: Day-wise / week-wise toggle. Today: Crimson Red `#DC143C` circle. Classes use status color coding (Scheduled: gray, Cancelled: Rose Red, Rescheduled: Amber, CT: Warm Orange, Holiday: Amber).
- **Upcoming CTs Widget**: Card list with Warm Orange `#DA532C` CT badge, showing course, date, time, room, topic.
- **Upcoming Assignments Widget**: Card list with due date tags (Upcoming: Slate Gray, Due Soon ≤24h: Amber, Overdue: Rose Red).
- **CT Marks Section**: Course-wise marks organized in collapsible accordions. Grade color coding (see Sprint 1 Results prompt).
- **Class Count Section**: Table showing courses × teacher → class count for current semester.
- **Quick Links**: Navigation links to public Resource Page and Result Page.
- **Personalization**: Dashboard filtered to student's own batch and current semester ONLY.

#### Teacher Dashboard (`FR-29`)
- **General Board**: Consolidated upcoming classes across all assigned batches, sorted by date/time. Next class highlighted with Crimson Red `#DC143C` accent.
- **Batch-Wise Tabs**: Horizontal tabs for each assigned batch. Each tab shows: batch schedule, class count per course, upcoming CTs/assignments.
- **Class Count Stats**: Number of classes taken per batch for the current semester, displayed as stat counter cards with Poppins bold numbers.
- **Quick Actions Row**: Prominent action buttons: "Cancel Class", "Reschedule Class", "Schedule CT", "Create Assignment" — all in Crimson Red `#DC143C`.
- **Teacher Unique ID Display**: Teacher's unique system ID shown in profile/header area.

#### Admin Dashboard (`FR-30`)
- **System Overview Cards**: Total students, teachers, active batches, current semesters, upcoming events — stat cards with Crimson Red `#DC143C` Admin accent.
- **Pending Actions Panel**: Semester promotion requests (Amber `#F59E0B` badges with count), unverified registrations, flagged conflicts.
- **Room Allocation Matrix Preview**: Mini grid showing room occupancy for current day/week (links to full Room Matrix page).
- **Holiday Calendar Preview**: Next 5 upcoming holidays with Amber `#F59E0B` accent.
- **Quick Actions**: Links to Semester Creation, Routine Generation, User Management, Holiday Management.
- **Audit Log Feed**: Recent system activities (schedule changes, promotions, role changes) with timestamps, user IDs, and action descriptions. Scrollable feed with Slate Gray `#6B7280` timestamps.

#### Notification System (`FR-31`)
- **Notification Bell (Navbar)**: Bell icon with unread badge count in Crimson Red `#DC143C` circle. Badge hidden when count is 0.
- **Notification Panel (Dropdown/Slide-Out)**:
  - Unread notifications: Bold text with Crimson Red `#DC143C` left-border accent.
  - Read notifications: Regular weight, muted Slate Gray `#6B7280`.
  - Notification item shows: icon (per type), message, relative timestamp ("2 hours ago").
  - "Mark All as Read" action in Crimson Red `#DC143C` text link.
  - Empty state: "No new notifications" message.
- **Notification Type Icons**:
  - Class Cancelled/Rescheduled: Calendar icon.
  - CT Scheduled/Marks Uploaded: Clipboard icon.
  - Assignment Created: Document icon.
  - Promotion: Arrow-up icon.
  - Holiday: Sun icon.
  - Resource/Result Published: Book/Trophy icon.

- **Typography**: Poppins for dashboard section headers and stat numbers, Inter for data details, notification text, and table content.

### Domain Rules (from CONTEXT.md and docs/srs.md)

1. **Student Dashboard (`FR-28`)**:
   - Sections: Today's Schedule, Calendar View, Upcoming CTs, Upcoming Assignments, CT Marks, Class Count.
   - Personalized to student's batch and current semester ONLY.
   - Navigation links to public Resource Page and Result Page.
2. **Teacher Dashboard (`FR-29`)**:
   - General Board: consolidated view across all assigned batches.
   - Batch-wise drill-down with schedule, class count, upcoming CTs/assignments.
   - Quick action buttons for class cancellation, rescheduling, CT scheduling, assignment creation.
   - Displays teacher's unique system ID.
3. **Admin Dashboard (`FR-30`)**:
   - System Overview: totals, pending actions, room utilization, holiday calendar.
   - Audit Log feed of recent system activities with user IDs, timestamps, and action details.
   - Quick links to all admin management pages.
4. **Notification Event Triggers (`FR-31`)**:
   - Class cancelled → Students of the batch.
   - Class rescheduled → Students of the batch.
   - New CT scheduled → Students of the batch.
   - CT marks uploaded → Students of the batch.
   - New assignment created → Students of the batch.
   - Semester promotion request submitted → Admin(s).
   - Semester promoted → Students and CR of the batch.
   - Holiday declared → All users.
   - New resource uploaded → Students of the relevant semester.
   - New result published → Students of the batch.
5. **Notification Mechanics**:
   - Notifications appear as a badge count on the navigation bar bell icon.
   - Listed in a dropdown notification panel, newest first.
   - Users can mark individual notifications as read or "Mark All as Read".
   - Unread notifications are visually highlighted.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review `docs/srs.md` (FR-28, FR-29, FR-30, FR-31), `docs/backend_design.md` §8 (Notification System), §9 (Dashboard APIs), and `docs/frontend_color_palate.md`.
2. Run `/to-spec` to define test seams across backend and frontend.
3. Run `/to-tickets` to split into vertical slices:
   - Ticket 1: `notificationService` — create, bulk fan-out for batch, unread count, mark read, mark all read. Vitest unit tests (`/tdd`).
   - Ticket 2: `dashboardService` — student aggregation (today's schedule, upcoming CTs/assignments, CT marks, class count), teacher aggregation (multi-batch, general board, class count), admin aggregation (system overview, pending actions, audit feed). Vitest unit tests (`/tdd`).
   - Ticket 3: Express routes for dashboards and notifications with RBAC and Supertest integration tests.
   - Ticket 4: Integrate notification triggers into existing services: `scheduleService` (cancel/reschedule), `ctService` (schedule CT, upload marks), `assignmentService` (create assignment), `promotionService` (request/approve), `holidayService` (declare), `resourceService` (upload), `resultService` (publish).
   - Ticket 5: Client React UI — Student Dashboard (Today's Schedule, Calendar, Upcoming CTs/Assignments, CT Marks, Class Count, Quick Links), Teacher Dashboard (General Board, Batch Tabs, Class Count Stats, Quick Actions), Admin Dashboard (System Overview, Pending Actions, Room Matrix Preview, Holiday Calendar, Quick Links, Audit Log), Notification Bell + Panel (Navbar bell, dropdown panel, mark-as-read, type-specific icons).
4. Run `/implement` with `/tdd`.
5. Verify with CI Quality Gates:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
6. Run `/code-review` before finalizing.
```

---

## Sprint Completion: Gap Closure & Integration Polish

> **Assigned to:** Lead / Any Available Member  
> **Target:** Fix any missing Sprint 1 features, cross-module integration, end-to-end validation, and production readiness polish  
> **SRS Requirements:** All remaining gaps from `FR-01` through `FR-31`, plus `NFR-01` through `NFR-31`  
> **Key References:** [`CONTEXT.md`](file:///CONTEXT.md), [`docs/srs.md`](file:///docs/srs.md), [`docs/backend_design.md`](file:///docs/backend_design.md), [`docs/frontend_color_palate.md`](file:///docs/frontend_color_palate.md), All ADRs in [`docs/adr/`](file:///docs/adr/)

```markdown
You are an autonomous senior full-stack engineer performing the Sprint Completion & Gap Closure pass for Smart_Schedular using the Matt Pocock engineering workflow.

### Objective

Audit the entire codebase against the SRS (all FR and NFR requirements), identify and fix any features that were not fully implemented or integrated during Sprint 1 and Sprint 2, ensure cross-module wiring is complete, and bring the project to a production-ready state.

### Known Gap Areas to Audit & Fix

The following areas are known to have potential gaps or missing integrations from Sprint 1 and Sprint 2. Audit each one and implement what's missing:

#### 1. Authentication & Session Gaps
- **FR-02 Unverified Account Purge**: Ensure the `node-cron` job that purges accounts unverified for >7 days is implemented and running (`server/src/jobs/`).
- **FR-03 Account Lockout**: Verify the 5-attempt lockout with 15-minute cooldown is fully working end-to-end with proper error messaging.
- **Resend Verification Email**: Expired verification links should offer a "resend verification email" option (FR-02 confirmation criteria).

#### 2. Preloaded Data Management (AN-01, AN-02)
- **Admin Preloaded Student/Teacher Upload Interface**: Ensure Admin can bulk-import or manually enter student and teacher verification rosters via the UI.
- **Routes**: `POST /api/admin/preloaded-students` (bulk CSV upload), `POST /api/admin/preloaded-teachers`, `GET /api/admin/preloaded-students`, `GET /api/admin/preloaded-teachers`.
- Frontend Admin panel for managing preloaded rosters.

#### 3. CR Role Management (AN-10)
- **Promote Student → CR / Demote CR → Student**: Admin ability to change a student's role between STUDENT and CR for any batch.
- Route: `PATCH /api/admin/users/:id/role`.
- Enforce constraint: only one active CR per batch (`C-05`).
- Promotion must include validation that the user belongs to the target batch.

#### 4. Audit Logging (NFR-12, R-02, R-06)
- Ensure all sensitive operations log to `AuditLog` table:
  - Login attempts (success + failure), password changes, schedule modifications, role changes, semester promotions, result uploads, resource uploads.
- Each log entry includes: userId, action, entityType, entityId, ipAddress, details (JSON), createdAt.
- Admin Audit Log viewer on the Admin Dashboard (searchable, filterable by action type, user, date range).

#### 5. Assignment Submission Support (FR-21, ADR-0005)
- **Dual Submission Mode**: Ensure assignments support both external URL submissions (GitHub/Google Drive links) and direct document file attachments.
- `AssignmentSubmission` model may need to be added to Prisma schema if missing.
- Routes: `POST /api/assignments/:id/submissions`, `GET /api/assignments/:id/submissions`.
- Student UI: Assignment detail view with submission form (URL input + file upload).
- Teacher UI: Assignment submissions list view.

#### 6. CT Marks Aggregation Display (FR-27, ADR-0005)
- **Student CT Marks Dashboard Section**: Ensure students see marks organized by course with CT number, date, topic, marks obtained, and max marks.
- **"Pending" State**: If marks for a CT have not been uploaded, display "Pending."
- **Class Statistics**: Optional aggregate view showing class average, highest, lowest per CT.

#### 7. Class Count Tracking (SN-05, TN-10)
- **Student View**: Total number of classes conducted per course per teacher for the current semester (batch-wise count).
- **Teacher View**: Total classes taken per batch for the current semester.
- Routes: `GET /api/schedules/class-count?batchId=&semesterId=`.

#### 8. Responsive Design Verification (NFR-17)
- Verify all pages and components are fully responsive across breakpoints: desktop (1920px), laptop (1366px), tablet (768px), mobile (320–480px).
- Test and fix any overflow, truncation, or layout-breaking issues.
- Ensure consistent spacing, card radii, and shadow tokens at all sizes.

#### 9. Security Hardening (NFR-06 to NFR-12)
- **Helmet middleware** for security headers (`helmet`).
- **Rate limiting** on auth routes (`express-rate-limit`).
- **CSRF protection** considerations (if using cookies).
- **Input validation consistency**: Ensure all endpoints use Zod validation schemas.
- **Error handling**: Ensure no stack traces, internal paths, or database details leak to the client (NFR-15).

#### 10. Cross-Module Navigation & UI Polish
- Ensure all navigation links work correctly between modules:
  - Student Dashboard → Resource Page, Result Page, CT Marks, Assignment Tracker.
  - Teacher Dashboard → Class Management, CT Scheduling, Assignment Management, Marks Upload.
  - Admin Dashboard → Semester Management, Routine Generation, Room Matrix, Holiday Calendar, User Management, Audit Log.
- Navbar should reflect the logged-in user's role with the correct role badge color.
- Ensure consistent use of design tokens (colors, typography, shadows) across all pages.

### Testing & Verification

- **Backend**: `cd server && npm test && npx tsc --noEmit && npx prisma validate && npm run build`
- **Frontend**: `cd client && npm test && npm run typecheck && npm run lint && npm run build`
- **Cross-Browser Check**: Manual or automated verification on Chrome, Firefox, Edge, Safari.
- **Responsive Check**: Test at 1920px, 1366px, 768px, and 375px breakpoints.

### Step-by-Step Workflow

1. Run `/grill-with-docs` or review the complete `docs/srs.md` (all FRs and NFRs), `docs/backend_design.md`, `CONTEXT.md`, and all ADRs.
2. Audit every FR (FR-01 through FR-31) against the codebase — check for route existence, service logic, controller wiring, frontend page/component, and test coverage.
3. Audit every NFR (NFR-01 through NFR-31) — check for middleware presence, indexing strategy, error handling, security headers, and responsive design.
4. Run `/to-tickets` to create tickets for each identified gap.
5. Run `/implement` with `/tdd` for each gap fix.
6. Run full CI Quality Gates after all fixes:
   - Backend: `cd server && npm test && npx tsc --noEmit`
   - Frontend: `cd client && npm test && npm run build && npm run lint`
7. Run `/code-review` on the complete Sprint 2 diff against the Sprint 1 baseline.
```
