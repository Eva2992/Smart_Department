Software Requirements Specification (SRS)
1. Introduction
1.1 Purpose
The purpose of this document is to provide a comprehensive Software Requirements Specification (SRS) for the JU CSE Department Academic Management System — a web-based platform designed to digitize and streamline the academic operations of the Department of Computer Science and Engineering (CSE) at Jahangirnagar University, Savar, Dhaka-1342, Bangladesh.
 
Currently, the department manages its academic scheduling, classroom allocation, class tracking, CT (Class Test) scheduling, result management, and resource distribution through manual or semi-manual processes. This often leads to scheduling conflicts, inefficient resource utilization, communication gaps between faculty and students, and a lack of centralized academic information.
 
The proposed system aims to solve these problems by providing a unified digital platform where administrators can allocate classrooms and labs for the entire semester, teachers can manage their classes and assessments, class representatives (CRs) can upload resources and results, and students can view their personalized academic schedules, marks, and downloadable study materials — all without scheduling conflicts and with role-based access control.
 
This document defines the functional and non-functional requirements of the system, identifies the stakeholders and their needs, outlines the operating environment, and describes the constraints and assumptions under which the system will be developed and deployed.
1.2 Intended Audience
This SRS document is intended for the following audiences:
 
Audience
Purpose
Development Team
To understand the complete system requirements, features, user flows, and technical constraints for implementation.
Project Supervisor / Faculty Advisor
To review the scope, feasibility, and completeness of the proposed system for academic evaluation (CSE 404 — Software Engineering).
Quality Assurance (QA) Testers
To derive test cases from the functional and non-functional requirements to validate the system against specifications.
Department Administration (CSE, JU)
To understand the capabilities of the system and provide feedback on department-specific workflows, policies, and operational needs.
Future Maintainers
To use this document as a reference for understanding the system's design rationale and requirements during maintenance or feature extension.
 
1.3 Intended Use
This SRS document shall be used in the following ways:
 
As a development guide: The development team will use this document as the primary reference for building all features, modules, and interfaces of the system. Every functional requirement described herein maps directly to a feature that must be implemented.
As a validation baseline: QA testers will use the requirements and user stories in this document to create test plans and verify that the delivered system meets all specified criteria.
As a communication contract: This document serves as a mutual agreement between the development team and stakeholders (department faculty, administration) about what the system will and will not do in its initial release.
As a project evaluation artifact: This document is a deliverable for the CSE 404 Software Engineering course and will be evaluated for completeness, clarity, and adherence to SRS standards.
1.4 Product Scope
The JU CSE Department Academic Management System is a full-stack web application that provides end-to-end digital management of the academic operations within the CSE department of Jahangirnagar University. The scope of the system is currently limited to the CSE department only and is not intended for university-wide deployment in its initial release.
 
Key Objectives:
 
Eliminate scheduling conflicts for classrooms, labs, and faculty across all batches and semesters.
Provide role-based personalized dashboards for Students, Class Representatives (CRs), Teachers, and Administrators.
Digitize the complete class routine management lifecycle — from semester creation to day-wise schedule generation, class rescheduling, cancellation, and conflict detection.
Enable CT (Class Test) scheduling, assignment distribution, and marks management with full traceability.
Provide a centralized resource sharing platform for study materials, organized by year and semester.
Maintain semester-wise final examination results accessible to all users.
Support batch and semester lifecycle management including promotion, demotion, and student status updates.
 
System Boundaries:
 
In Scope
Out of Scope
Academic scheduling and classroom/lab allocation for the CSE department
University-wide scheduling across all departments
Role-based dashboards for 4 user types (Student, CR, Teacher, Admin)
Integration with the university's central ERP or financial systems
CT and assignment management within courses
Online examination or proctoring functionality
Semester final result display (uploaded by CRs)
Automated result generation from university grade sheets
Study resource upload and download (semester-wise)
Video lectures, LMS-style content delivery, or MOOC features
Holiday and off-day management for the CSE department
University-wide academic calendar management
Email-based user verification and authentication
SSO integration with university portal or third-party OAuth
 
 
Department Context:
 
The Department of Computer Science and Engineering was established in 1991 (formerly known as the Department of Electronics and Computer Science) under the Faculty of Mathematical and Physical Sciences. The department is currently chaired by Prof. Dr. Md. Golam Moazzam and has approximately 31 faculty members. It offers B.Sc. (Honours), M.Sc., Professional M.Sc. (PMSCS), M.Phil., and Ph.D. programs. As of 2026, the department has produced over 55 undergraduate batches.
 
Physical Resources Managed by the System:
 
Resource Type
Room Number
Description
Classroom
R-101
Standard lecture classroom
Classroom
R-102
Standard lecture classroom
Classroom
R-103
Standard lecture classroom
Computer Lab
R-201
Computer laboratory
Computer Lab
R-203
Computer laboratory
Computer Lab
R-302
Computer laboratory
Electrical Circuit Lab
R-105
Specialized lab for electrical circuit experiments
Multipurpose Room
R-202
Used for exams, seminars, and workshops
 
1.5 Risk Definitions
The following risks have been identified that could impact the development, deployment, or operation of the system:
 
Risk ID
Risk Description
Severity
Likelihood
Mitigation Strategy
R-01
Scheduling Conflict: A teacher reschedules a class to a time slot where the assigned classroom or lab is already occupied by another class, exam, or event.
High
High
The system will implement a real-time conflict detection engine that checks room availability, teacher availability, and batch schedule before allowing any schedule change. Conflicting requests will be blocked with a descriptive error message.
R-02
Unauthorized Schedule Modification: A teacher modifies another teacher's class schedule using a shared or compromised account.
High
Medium
Each teacher will be assigned a unique ID. The system will enforce ownership-based access control — only the teacher assigned to a class can modify that specific class's schedule. All modifications will be logged with timestamps and user IDs for audit.
R-03
Data Loss During Semester Transition: When an admin promotes a batch to the next semester, the previous semester's routine data is deleted. If the promotion is premature or erroneous, critical schedule data may be lost.
High
Low
The system will require admin confirmation before semester promotion. A soft-delete mechanism will archive the previous semester's data for a configurable retention period (e.g., 30 days) before permanent deletion. CR promotion requests will undergo validity checks before processing.
R-04
Incorrect User Registration: A student or teacher registers with false credentials, gaining unauthorized access to the system and its data.
Medium
Medium
Registration will require admin-verified data. The admin will pre-load authorized student and teacher information (university ID, email, batch, etc.) into the system. During registration, user-provided details will be cross-verified against this pre-loaded dataset. Only verified users will be granted access.
R-05
System Downtime During Peak Usage: The system experiences high traffic during exam routine publication, result uploads, or semester start, causing slowdowns or outages.
Medium
Medium
The application will be deployed on a scalable cloud infrastructure. Database queries will be optimized with proper indexing. Caching mechanisms will be used for frequently accessed data (e.g., routines, results). Load testing will be conducted before deployment.
R-06
Role Escalation by CR: A Class Representative misuses their elevated privileges to upload incorrect results or tamper with shared resources.
Medium
Low
All CR actions (result uploads, resource uploads, promotion requests) will be logged and auditable. The admin will have the ability to review, revert, or override any CR action. Sensitive operations will require additional confirmation steps.
R-07
Browser Compatibility Issues: The web application may not render correctly across all browsers and devices, leading to a degraded user experience.
Low
Medium
The frontend will be built with React, which provides cross-browser compatibility. The application will be tested on Chrome, Firefox, Safari, and Edge. Responsive design will ensure usability on mobile and tablet devices.
 
 
 
2. Overall Description
2.1 User Classes and Characteristics
The system defines four distinct user classes, each with different access levels, responsibilities, and interaction patterns. All users belong to the CSE department of Jahangirnagar University.
 
 
2.1.1 Normal Student
Description: Normal Students are the primary consumers of the system. They are undergraduate (Honours) or postgraduate (Masters) students currently enrolled in the CSE department. Each student is associated with a specific batch and a current semester. The system provides them with a personalized view of their academic schedule, upcoming assessments, marks, and downloadable resources.
 
Characteristics:
 
Attribute
Detail
Program Types
Honours (B.Sc.) — 4-year program with 8 semesters; Masters (M.Sc.) — program with 2 semesters
Active Honours Batches
4 batches active at any time (e.g., 52nd, 53rd, 54th, 55th)
Active Masters Batches
1 batch active at any time
Enrollment
Students are enrolled in their current semester only. They see only their own batch's information.
Technical Proficiency
Moderate to high (CSE students are familiar with web applications)
Frequency of Use
Daily — to check class schedules, upcoming CTs, assignments, and marks
Access Level
Read-only for personalized data; read access to public pages (resources, results)
 
 
 
2.1.2 Class Representative (CR)
Description: Class Representatives are students who have been designated (by the admin) to serve as the liaison between their batch and the department. They possess all the capabilities of a Normal Student plus additional elevated privileges for managing resources and results on behalf of their batch. CRs may change each semester as decided by the department.
 
Characteristics:
 
Attribute
Detail
Selection
Appointed by the Admin. A student can be promoted to CR, and a CR can be demoted back to a Normal Student by the Admin.
Scope
Each active batch has one CR. The CR's elevated actions apply only to their own batch.
Technical Proficiency
High (expected to be more engaged with the system than regular students)
Frequency of Use
Several times per week — for uploading resources, results, and managing semester transitions
Access Level
All Normal Student permissions + upload resources to the public Resource Page, upload semester final results to the public Result Page, and submit semester promotion requests for their batch.
 
 
 
2.1.3 Teacher
Description: Teachers are faculty members of the CSE department who use the system to manage their classes, assessments, and academic events. A teacher may be involved with multiple batches across different semesters simultaneously. Each teacher is assigned a unique system ID to ensure accountability and prevent unauthorized modification of other teachers' schedules.
 
Characteristics:
 
Attribute
Detail
Count
Approximately 31 faculty members (Professors, Associate Professors, Assistant Professors, Lecturers)
Multi-Batch Involvement
A teacher may teach courses in multiple batches simultaneously
Unique ID
Each teacher has a unique system-generated ID for tracking and access control
Technical Proficiency
Moderate to high
Frequency of Use
Daily — to check schedules, manage classes, upload CT marks, assign assignments
Access Level
Personalized dashboard (multi-batch view), class cancellation/rescheduling (own classes only with conflict check), CT scheduling (within own class times), assignment creation, CT marks upload. The department Chairman has additional privileges to allocate seminars and workshops.
 
 
 
2.1.4 Admin
Description: Admins are the system superusers who manage the foundational data and configurations of the platform. They are responsible for setting up semesters, creating day-wise class routines, managing physical resources (classrooms, labs), handling user verification and registration data, managing holidays, generating exam routines, and processing semester promotions. The Admin role is typically assigned to designated department staff or faculty authorized by the department Chairman.
 
Characteristics:
 
Attribute
Detail
Responsibilities
Full system configuration and management
Technical Proficiency
High (trained on the system)
Frequency of Use
Daily during semester setup; weekly during regular operations; high activity during semester transitions and exam periods
Access Level
Full access to all system modules. Can view all data across all batches and semesters. Manages user registration data, semester creation, routine generation, resource allocation, holiday management, exam routine generation, semester promotions, and role assignments (student ↔ CR).
 
 
 
2.2 User Needs
This section describes the specific needs of each user class that the system must fulfill.
 
 
2.2.1 Normal Student Needs
Need ID
Need Description
Priority
SN-01
Personalized Class Schedule: View a calendar-based, day-wise schedule for the current semester showing class name, room number, time slot, and course teacher — filtered to show only the student's own batch.
High
SN-02
Upcoming CT Notifications: View a list of upcoming Class Tests (CTs) with date, time, course name, and room number.
High
SN-03
Upcoming Assignment Tracker: View a list of pending assignments with course name, description, and due date.
High
SN-04
CT Marks Viewer: View marks obtained in all CTs for the current semester, organized by course.
High
SN-05
Class Count Tracker: View the total number of classes conducted per course per teacher for the current semester (batch-wise count).
Medium
SN-06
Resource Download (Public Page): Access a public page where study resources (notes, slides, past papers) are organized by year and semester. Download any available resource.
Medium
SN-07
Semester Final Result (Public Page): Access a public page displaying semester final results for all students. Recently published results appear at the top.
Medium
 
 
 
2.2.2 Class Representative (CR) Needs
Need ID
Need Description
Priority
CN-01
All Normal Student Needs: CRs have all the same needs as Normal Students (SN-01 through SN-07).
High
CN-02
Resource Upload: Upload study resources (PDF, documents, images) to the public Resource Page, categorized by semester and year.
High
CN-03
Result Upload: Upload semester final examination results to the public Result Page for their batch.
High
CN-04
Semester Promotion Request: Submit a request to the Admin to promote the batch from the current semester to the next semester upon completion of all academic activities.
High
 
 
 
2.2.3 Teacher Needs
Need ID
Need Description
Priority
TN-01
Multi-Batch Dashboard: View a consolidated dashboard showing all classes across all batches the teacher is assigned to, with a general board displaying upcoming classes across all batches.
High
TN-02
Batch-Wise Schedule View: Drill down into a specific batch to see upcoming classes, class history, and class count for that batch.
High
TN-03
Class Cancellation: Cancel a scheduled class. The system updates the schedule and notifies affected students.
High
TN-04
Class Time Update: Modify the time of a scheduled class within the same day, subject to conflict checking by the system.
High
TN-05
Class Reassignment: Reschedule a class to a different day, subject to conflict checking by the system (room, teacher, and batch availability). The system will suggest available slots.
High
TN-06
CT Scheduling: Schedule a Class Test within one of the teacher's existing class time slots. The class for that slot is automatically converted to a CT session.
High
TN-07
CT Marks Upload: Upload marks for a CT, associating scores with enrolled students for that batch.
High
TN-08
Assignment Creation: Create and assign homework/assignments to a specific batch with a description and due date.
Medium
TN-09
Seminar/Workshop Allocation: Allocate a room and time slot for a seminar or workshop (restricted to the department Chairman only). The system performs conflict checking before allocation.
Medium
TN-10
Class Count View: View the total number of classes taken per batch for the current semester.
Low
 
 
 
2.2.4 Admin Needs
Need ID
Need Description
Priority
AN-01
Student Data Pre-loading: Import or manually enter student information (name, university ID, email, batch, program) for authentication and verification during registration.
High
AN-02
Teacher Data Pre-loading: Import or manually enter teacher information (name, unique ID, email, designation) for authentication and verification during registration.
High
AN-03
Semester Creation: Create a new semester with start date, end date, associated batch, and course list.
High
AN-04
Day-Wise Routine Generation: Based on the department-provided class routine, generate a full calendar of day-wise class schedules for the entire semester, allocating rooms, teachers, and time slots.
High
AN-05
Classroom & Lab Resource Allocation: Assign classrooms (R-101, R-102, R-103), computer labs (R-201, R-203, R-302), the electrical circuit lab (R-105), and the multipurpose room (R-202) to classes, exams, and events while ensuring no conflicts.
High
AN-06
Semester Final Exam Routine: Generate and publish the semester final examination routine, allocating rooms and time slots for each exam.
High
AN-07
Semester Promotion Processing: Review CR-submitted promotion requests, validate completion criteria, and promote the batch to the next semester. Upon promotion, the current semester's routine is cleared to prepare for the new semester's fresh schedule.
High
AN-08
Holiday & Off-Day Management: Define holidays and off-days in the academic calendar. Classes scheduled on declared holidays are automatically cancelled or flagged.
High
AN-09
Student Semester Override: Manually update a student's semester (e.g., moving a student back due to a drop or removing a student who has left the program).
Medium
AN-10
Role Management (Student ↔ CR): Promote a Normal Student to CR or demote a CR back to a Normal Student for any batch.
Medium
AN-11
User Registration Verification: Verify user registration requests against pre-loaded data before granting system access.
High
AN-12
System-Wide Visibility: View all data across all batches, semesters, schedules, and users for monitoring and administrative purposes.
Medium
 
 
 
2.3 Operating Environment
The system will operate in the following environment:
 
Client-Side (Frontend):
 
Component
Specification
Platform
Web browser (cross-platform)
Supported Browsers
Google Chrome (v100+), Mozilla Firefox (v100+), Microsoft Edge (v100+), Safari (v15+)
Supported Devices
Desktop computers, laptops, tablets, and smartphones
Responsive Design
The UI will be fully responsive, adapting to screen sizes from 320px (mobile) to 1920px+ (desktop)
Internet Requirement
Active internet connection required for all operations
 
 
Server-Side (Backend):
 
Component
Specification
Runtime
Node.js (LTS version, v18+) with TypeScript
Framework
Express.js or equivalent Node.js HTTP framework
Database
PostgreSQL (v14+)
ORM
Prisma ORM for type-safe database access and migrations
Authentication
JWT (JSON Web Tokens) for session management; bcrypt for password hashing
Email Service
SMTP-based email service for verification emails and notifications
 
 
Deployment:
 
Component
Specification
Hosting
Cloud-based deployment (e.g., AWS, DigitalOcean, or Vercel/Railway)
OS
Linux-based server (Ubuntu 24.04 LTS or equivalent)
Database Hosting
Managed PostgreSQL instance or self-hosted on the same server
Domain
Custom domain (to be configured by the department)
SSL
HTTPS enforced via TLS/SSL certificate
 
 
Tech Stack Summary:
 
Layer
Technology
Frontend
React (v18+) with TypeScript
Backend
Node.js with TypeScript
Database
PostgreSQL + Prisma ORM
Authentication
JWT + bcrypt + Email Verification
 
2.4 Constraints
The following constraints apply to the development and deployment of the system:
 
Constraint ID
Constraint Description
C-01
Department Scope Only: The system is designed exclusively for the CSE department of Jahangirnagar University. It does not support multi-department or university-wide operations in its initial release.
C-02
Fixed Physical Resources: The system must work within the fixed set of physical resources available to the department — 3 classrooms (R-101, R-102, R-103), 3 computer labs (R-201, R-203, R-302), 1 electrical circuit lab (R-105), and 1 multipurpose room (R-202). Adding new rooms requires admin configuration.
C-03
Internet Dependency: The system requires an active internet connection for all operations. No offline mode is supported.
C-04
Manual Data Pre-loading: Student and teacher data for authentication verification must be manually pre-loaded by the admin. There is no automated integration with the university's existing student information system.
C-05
Single CR Per Batch: Each batch can have exactly one active Class Representative at any time. CR changes must be processed by the Admin.
C-06
CT Within Class Time Only: Class Tests can only be scheduled during a teacher's existing class time slots. Standalone CT slots outside of class hours are not supported.
C-07
Chairman-Only Seminar/Workshop Allocation: Only the department Chairman (a teacher with elevated privileges) can allocate rooms and time slots for seminars and workshops. Regular teachers cannot perform this action.
C-08
No Automated Result Calculation: The system does not calculate grades or GPAs. Semester final results are uploaded as-is by CRs. CT marks are uploaded by teachers and displayed without aggregation.
C-09
Academic Calendar Dependency: The day-wise routine generation depends on the admin manually inputting the department-provided routine. The system does not auto-generate optimal schedules.
C-10
Language: The system's user interface will be in English. Bangla language support is not included in the initial release.
 
2.5 Assumptions
The following assumptions are made during the creation of this SRS. If any of these assumptions prove false, the affected requirements may need to be revisited.
 
Assumption ID
Assumption Description
A-01
Stable Internet Access: All users (students, teachers, admins) have reliable internet access to use the system. The university campus and most users' residences have sufficient connectivity.
A-02
Admin Availability: At least one Admin user will be available to set up and manage the system at the start of each semester, including creating semesters, generating routines, pre-loading user data, and managing holidays.
A-03
Accurate Pre-loaded Data: The student and teacher data pre-loaded by the Admin for registration verification is accurate and up-to-date. The admin will maintain this data as students join, leave, or change batches.
A-04
Routine Provided by Department: The department provides a standard class routine (course-teacher-time-room mapping) at the beginning of each semester, which the admin uses to generate the day-wise calendar schedule.
A-05
Single Department Building: All classrooms, labs, and the multipurpose room are located within the CSE department building, and their room numbers (R-101, R-102, etc.) are fixed and universally understood within the department.
A-06
Honours and Masters Programs Only: The initial release targets Honours (B.Sc.) and Masters (M.Sc.) students. PMSCS, M.Phil., and Ph.D. programs are excluded from the initial scope but may be added in future releases.
A-07
Email Accessibility: All users have access to a personal or university email address for account verification, password recovery, and notifications.
A-08
Standard Semester Structure: Honours program follows an 8-semester structure (4 years), and Masters follows a 2-semester structure. Each batch progresses sequentially through semesters without parallel semester enrollments.
A-09
Browser Availability: Users have access to a modern web browser (Chrome, Firefox, Edge, or Safari) on their devices. The system does not need to support legacy browsers (e.g., Internet Explorer).
A-10
Cooperative Usage: Teachers and CRs will use the system responsibly within their authorized roles. Intentional misuse (e.g., uploading false results, scheduling fake CTs) is addressed by audit logging but is assumed to be rare.
 
 
 
3. Requirements
3.1 Functional Requirements
The functional requirements are organized by module and written in User Story format with confirmation (acceptance criteria).
 
 
3.1.1 Authentication & User Management
FR-01: User Registration
 
As a new user (Student, CR, Teacher, or Admin), I want to register on the platform by providing my details, so that I can create an account and access the system based on my role.
 
Confirmation:
 
The registration form collects: full name, university ID, email address, password, role selection (Student/Teacher), batch (for students), and program type (Honours/Masters for students).
Upon form submission, the system cross-verifies the provided details (university ID, email, batch) against the admin pre-loaded dataset.
If verification fails, the system displays an error message: "Your information does not match our records. Please contact the department admin."
If verification succeeds, a verification email is sent to the provided email address with a unique activation link.
The account is created in an inactive state and is only activated after the user clicks the email verification link.
Duplicate registration (same university ID or email) is rejected with an appropriate error message.
 
 
 
FR-02: Email Verification
 
As a newly registered user, I want to verify my email address by clicking a verification link, So that my account is activated and I can log in.
 
Confirmation:
 
Upon successful registration, the system sends an email containing a unique, time-limited (24-hour expiry) verification link.
Clicking the link activates the user's account and redirects to the login page with a success message.
Expired links display an error message with an option to resend the verification email.
Accounts that remain unverified for 7 days are automatically purged from the system.
 
 
 
FR-03: User Login
 
As a registered and verified user, I want to log in with my email and password, So that I can access my personalized dashboard.
 
Confirmation:
 
The login form accepts email and password.
Upon successful authentication, a JWT token is issued and the user is redirected to their role-specific dashboard.
Invalid credentials display an error message: "Invalid email or password."
After 5 consecutive failed login attempts, the account is temporarily locked for 15 minutes.
The JWT token expires after 24 hours, requiring re-authentication.
 
 
 
FR-04: Password Change
 
As a logged-in user, I want to change my password, So that I can maintain the security of my account.
 
Confirmation:
 
The user must provide their current password and the new password (with confirmation).
The new password must meet minimum security requirements: at least 8 characters, including one uppercase letter, one lowercase letter, one digit, and one special character.
If the current password is incorrect, the system displays an error.
Upon successful password change, all existing sessions (JWT tokens) are invalidated, and the user is redirected to the login page.
 
 
 
FR-05: Forgot Password
 
As a user who has forgotten my password, I want to reset my password via email, So that I can regain access to my account.
 
Confirmation:
 
The user enters their registered email address on the forgot password page.
The system sends a password reset email with a unique, time-limited (1-hour expiry) reset link.
Clicking the link opens a form to set a new password (with confirmation).
After resetting, all existing sessions are invalidated, and the user is redirected to the login page with a success message.
If the email is not found in the system, the system still displays a generic success message (to prevent email enumeration attacks): "If an account with this email exists, a reset link has been sent."
 
 
3.1.2 Batch & Semester Management
FR-06: Semester Creation
 
As an Admin, I want to create a new semester with associated details, So that the academic schedule can be organized and managed for that semester.
 
Confirmation:
 
The admin specifies: semester name (e.g., "4th Year 2nd Semester"), program type (Honours/Masters), associated batch, start date, end date, and list of courses (course name, course code, credit hours, assigned teacher).
The system validates that no overlapping semester exists for the same batch.
Upon creation, the semester is set to "Active" status, and all associated students of that batch are automatically enrolled.
The created semester appears in the admin's semester management dashboard.
 
 
 
FR-07: Semester Promotion
 
As a Class Representative (CR), I want to submit a semester promotion request for my batch, So that my batch can transition from the current semester to the next semester.
 
Confirmation:
 
The CR can submit a promotion request only when the current semester's end date has passed or is within 7 days of passing.
The request is sent to the Admin for review and approval.
The admin sees a notification/alert about pending promotion requests on their dashboard.
 
 
 
FR-08: Semester Promotion Processing
 
As an Admin, I want to review and process semester promotion requests, So that batches can move to their next semester with a clean schedule.
 
Confirmation:
 
The admin reviews the CR's promotion request with details of the current semester (batch, semester, completion status).
Upon approval, the system:
Promotes all active students in the batch to the next semester.
Deletes the current semester's day-wise routine data to prepare for fresh schedule generation.
Updates the batch's current semester indicator.
The admin can reject a promotion request with a reason, which is communicated back to the CR.
Promotion of a batch from the 8th semester (Honours) or 2nd semester (Masters) marks the batch as "Completed."
 
 
 
FR-09: Student Semester Override
 
As an Admin, I want to manually update a specific student's semester, So that I can handle cases like drops, readmissions, or program departures.
 
Confirmation:
 
The admin can search for any student by name or university ID.
The admin can change the student's current semester to any valid semester (including marking them as "Dropped" or "Inactive").
The system updates the student's enrollment and dashboard accordingly.
An audit log entry is created recording the change, the admin who made it, and the timestamp.
 
 
3.1.3 Routine Management
FR-10: Day-Wise Routine Generation
 
As an Admin, I want to generate a full semester's day-wise class schedule based on the department's routine, So that every class, lab session, and time slot is mapped to specific dates, rooms, and teachers for the entire semester.
 
Confirmation:
 
The admin inputs the weekly routine template: for each day of the week, the list of classes with course name, teacher (by unique ID), room number, and time slot (start time, end time).
The system generates a day-wise calendar for the entire semester duration (start date to end date), replicating the weekly template across all weekdays.
Pre-declared holidays and off-days are automatically excluded from the generated calendar.
The generated routine is saved and immediately visible to all relevant users (students of the batch, assigned teachers, admin).
The admin can review and manually adjust individual day entries after generation.
 
 
 
FR-11: Routine View (Student)
 
As a Student, I want to view my class schedule in a calendar format, So that I know exactly when and where my classes are each day.
 
Confirmation:
 
The student's dashboard displays a day-wise calendar view of their current semester's classes.
Each class entry shows: course name, teacher name, room number, and time slot (e.g., "Data Structures — Dr. Md. Ezharul Islam — R-101 — 9:00 AM to 10:30 AM").
The calendar highlights today's date and shows upcoming classes prominently.
Students can navigate between days and weeks within the current semester.
Only the student's own batch schedule is visible; other batches' schedules are not shown.
 
 
 
FR-12: Routine View (Teacher)
 
As a Teacher, I want to view my class schedule across all batches I teach, So that I can manage my time effectively.
 
Confirmation:
 
The teacher's dashboard shows a general board listing all upcoming classes across all batches, sorted chronologically.
The teacher can filter by batch to see a batch-specific schedule view.
Each class entry shows: course name, batch name, room number, time slot, and date.
The dashboard also displays a count of total classes taken per batch for the current semester.
 
 
3.1.4 Classroom & Resource Allocation
FR-13: Room Allocation
 
As an Admin, I want to allocate classrooms, labs, and the multipurpose room to scheduled events, So that every class, lab session, exam, seminar, and workshop has an assigned room without conflicts.
 
Confirmation:
 
When creating or modifying any scheduled event (class, exam, seminar), the admin selects a room from the available pool: R-101, R-102, R-103, R-201, R-203, R-302, R-105, R-202.
The system checks for conflicts: if the selected room is already occupied at the requested date and time, the allocation is blocked with an error: "Room [R-XXX] is already allocated to [Event Name] from [Start Time] to [End Time] on [Date]."
The system displays a room availability matrix showing all rooms' schedules for the selected date, allowing the admin to visually identify open slots.
Successfully allocated rooms appear in the routine and are visible to all affected users.
 
 
 
FR-14: Room Conflict Detection
 
As the System, I want to automatically detect and prevent scheduling conflicts for rooms, teachers, and batches, So that no two events overlap for the same resource at the same time.
 
Confirmation:
 
Before any schedule creation or modification (routine generation, class rescheduling, CT scheduling, seminar allocation, exam routine), the system checks for three types of conflicts:
Room Conflict: The target room is already occupied at the requested date and time.
Teacher Conflict: The teacher is already assigned to another class/event at the requested date and time.
Batch Conflict: The batch already has a class/event at the requested date and time.
If any conflict is detected, the operation is blocked, and a detailed conflict message is displayed specifying the conflicting event, room, teacher, or batch.
Conflict detection operates in real-time and applies to all users who can modify schedules (Admin, Teacher, Chairman).
 
 
3.1.5 Class Update & Reschedule Management
FR-15: Class Cancellation
 
As a Teacher, I want to cancel one of my scheduled classes, So that students are informed and the room is freed up for other use.
 
Confirmation:
 
The teacher can select any of their upcoming scheduled classes and cancel it.
The system updates the class status to "Cancelled" in the routine.
The cancelled class slot is freed, and the room becomes available for other allocations.
Students of the affected batch see the cancellation reflected in their dashboard with a "Cancelled" label.
The teacher can only cancel their own classes (verified via unique teacher ID).
 
 
 
FR-16: Class Time Update
 
As a Teacher, I want to change the time of one of my scheduled classes on the same day, So that I can adjust for personal or departmental needs.
 
Confirmation:
 
The teacher selects a scheduled class and specifies a new time slot on the same day.
The system performs conflict detection (room, teacher, batch) for the new time slot.
If no conflict exists, the class time is updated, and the change is reflected on all users' dashboards.
If a conflict exists, the update is blocked with a descriptive error message.
The original time slot is freed upon successful update.
 
 
 
FR-17: Class Reassignment to Another Day
 
As a Teacher, I want to reschedule one of my classes to a different day, So that I can make up for cancelled classes or accommodate changes in my schedule.
 
Confirmation:
 
The teacher selects a scheduled class and specifies a new date, time slot, and (optionally) a different room.
The system performs comprehensive conflict detection for the new date, time, room, teacher, and batch.
If no conflicts are found, the class is reassigned to the new slot. The system suggests available time slots and rooms for the selected date to assist the teacher.
The rescheduled class appears in all affected users' dashboards with a "Rescheduled" indicator.
The teacher can only reschedule their own classes.
 
 
3.1.6 Holiday & Off-Day Management
FR-18: Holiday Declaration
 
As an Admin, I want to declare holidays and off-days in the academic calendar, So that no classes are scheduled on those days and the system accurately reflects the department's working schedule.
 
Confirmation:
 
The admin can add a holiday/off-day by specifying: date, reason/name (e.g., "Independence Day," "Eid-ul-Fitr," "University Foundation Day"), and scope (all batches or specific batches).
When a holiday is declared, all classes scheduled on that date are automatically flagged as "Holiday — No Class."
If a holiday is declared after the routine has already been generated, the system retroactively marks all classes on that date as cancelled.
Holidays are visible in all users' calendar views with a distinct visual indicator.
The admin can remove a previously declared holiday, which re-enables the classes for that date (if they were auto-cancelled, they are restored to their original status).
 
 
3.1.7 CT (Class Test) Scheduling
FR-19: CT Scheduling
 
As a Teacher, I want to schedule a Class Test (CT) during one of my existing class time slots, So that students are assessed on course material at planned intervals.
 
Confirmation:
 
The teacher selects one of their upcoming class slots and converts it to a CT session.
The system updates the class entry for that slot from "Regular Class" to "CT" with the CT topic/title.
Students see the CT in their "Upcoming CTs" section with course name, date, time, room, and topic.
The teacher cannot schedule a CT on a past date or on a class slot belonging to another teacher.
Multiple CTs can be scheduled for different classes on the same day (for different batches).
 
 
 
FR-20: CT Marks Upload
 
As a Teacher, I want to upload CT marks for students in my course, So that students can view their performance in each CT.
 
Confirmation:
 
After a CT has been conducted, the teacher can upload marks for each student enrolled in the batch.
The upload interface lists all enrolled students with input fields for marks.
The system validates that marks are within the allowed range (e.g., 0 to the maximum marks for the CT).
Once uploaded, students can immediately view their CT marks in their dashboard under the "CT Marks" section.
Teachers can edit previously uploaded CT marks until the semester ends.
 
 
3.1.8 Assignment Scheduling
FR-21: Assignment Creation
 
As a Teacher, I want to create and assign an assignment to a specific batch, So that students know what is expected of them and by when.
 
Confirmation:
 
The teacher specifies: course name, batch, assignment title, description/instructions, and due date.
The assignment is visible to all students of the specified batch in their "Upcoming Assignments" section.
The assignment displays: course name, title, description, assigned date, and due date.
Teachers can edit or delete assignments they have created.
Past-due assignments remain visible but are marked as "Past Due."
 
 
3.1.9 Final Exam Routine Management
FR-22: Semester Final Exam Routine Generation
 
As an Admin, I want to generate and publish the semester final examination routine, So that all students and teachers know the exam schedule, including dates, times, and rooms.
 
Confirmation:
 
The admin creates the exam routine by specifying: batch, semester, and for each exam — course name, date, time slot, room (typically the multipurpose room R-202 for exams, but other rooms may also be used).
The system performs conflict detection to ensure no two exams for the same batch overlap in time, and no room is double-booked.
The published exam routine is visible to all students of the affected batch and to the assigned teachers.
The exam routine is displayed in a dedicated "Exam Schedule" section of the student and teacher dashboards.
The admin can modify the exam routine after publication (with conflict re-checking).
 
 
3.1.10 Resource Sharing Module
FR-23: Resource Upload by CR
 
As a Class Representative, I want to upload study resources (notes, slides, past papers, reference materials) to the platform, So that all students across all batches can access and download them.
 
Confirmation:
 
The CR can upload files (PDF, DOCX, PPTX, images) with metadata: resource title, course name, semester, year, and resource type (Notes/Slides/Past Paper/Other).
Uploaded resources appear on the public Resource Page, organized by year and semester.
All users (including non-logged-in students, if the page is public) can browse and download resources.
The CR can delete resources they have uploaded. Admins can delete any resource.
File size limit: 50 MB per file. Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG.
 
 
 
FR-24: Resource Page (Public)
 
As any user (Student, Teacher, Admin, or visitor), I want to browse and download study resources organized by year and semester, So that I can access academic materials for reference or study.
 
Confirmation:
 
The Resource Page is publicly accessible (no login required).
Resources are categorized hierarchically: Year → Semester → Course → Resource Type.
Each resource entry shows: title, course name, semester, upload date, uploader (CR name), and file size.
Users can search and filter resources by course name, semester, year, or resource type.
A download button is provided for each resource. Download counts are tracked and displayed.
 
 
3.1.11 Result Generation Module
FR-25: Semester Final Result Upload by CR
 
As a Class Representative, I want to upload the semester final examination results for my batch, So that all students can view their results on the platform.
 
Confirmation:
 
The CR uploads results as a structured file (CSV or Excel) or through a data entry form, including: student name, university ID, course-wise marks/grades, and overall GPA/CGPA (if available).
Uploaded results appear on the public Result Page.
Recently published results appear at the top of the Result Page.
The CR can only upload results for their own batch's current semester.
Admins can edit or delete any uploaded results.
 
 
 
FR-26: Result Page (Public)
 
As any user, I want to view semester final results on a public page, So that I can check academic outcomes.
 
Confirmation:
 
The Result Page is publicly accessible.
Results are organized by batch and semester, with the most recent publications at the top.
Each result entry shows: batch name, semester, publication date, and a link to view detailed results.
Users can search by batch, semester, or student university ID.
 
 
 
FR-27: CT Marks View by Student
 
As a Student, I want to view my CT marks for the current semester, So that I can track my academic performance throughout the semester.
 
Confirmation:
 
The student's dashboard includes a "CT Marks" section showing marks for all CTs conducted in the current semester.
Marks are organized by course, with each CT entry showing: CT number, date, topic, marks obtained, and maximum marks.
If marks for a CT have not yet been uploaded by the teacher, the entry shows "Pending."
 
 
3.1.12 Role-Wise Dashboard & Notification System
FR-28: Student Dashboard
 
As a Student, I want to see a personalized dashboard showing all my academic information, So that I have a single place to view my schedule, upcoming assessments, and marks.
 
Confirmation:
 
The dashboard includes the following sections:
Today's Schedule: Classes for today with time, room, course, and teacher.
Calendar View: A day-wise/week-wise view of the semester's class schedule.
Upcoming CTs: List of upcoming Class Tests with date, time, course, and room.
Upcoming Assignments: List of pending assignments with course, title, and due date.
CT Marks: Current semester's CT marks organized by course.
Class Count: Number of classes taken per course by each teacher for the current semester.
The dashboard is personalized to the student's batch and current semester only.
Navigation links to the public Resource Page and Result Page are provided.
 
 
 
FR-29: Teacher Dashboard
 
As a Teacher, I want to see a personalized dashboard showing my classes across all batches, So that I can efficiently manage my teaching responsibilities.
 
Confirmation:
 
The dashboard includes:
General Board: A consolidated view of all upcoming classes across all batches, sorted by date and time.
Batch-Wise View: Tabs or navigation for each batch the teacher is assigned to, showing that batch's schedule, class count, and upcoming CTs/assignments.
Class Count: Total classes taken per batch for the current semester.
Quick Actions: Buttons to cancel a class, reschedule a class, schedule a CT, or create an assignment.
The dashboard displays the teacher's unique ID for reference.
 
 
 
FR-30: Admin Dashboard
 
As an Admin, I want to see a comprehensive dashboard showing the overall system state, So that I can monitor and manage all academic operations.
 
Confirmation:
 
The dashboard includes:
System Overview: Total students, teachers, active batches, current semesters, and upcoming events.
Pending Actions: Semester promotion requests, unverified registrations, and flagged conflicts.
Room Allocation Matrix: A visual grid showing room occupancy across all time slots for the current day/week.
Holiday Calendar: List of upcoming holidays and off-days.
Quick Actions: Links to semester creation, routine generation, user management, and holiday management.
Audit Log: Recent system activities (schedule changes, promotions, role changes) with timestamps and user IDs.
 
 
 
FR-31: In-App Notifications
 
As any user, I want to receive notifications about schedule changes, new CTs, assignments, and other important updates, So that I stay informed without actively checking each section.
 
Confirmation:
 
Notifications are generated for the following events:
Class cancelled (→ Students of the batch)
Class rescheduled (→ Students of the batch)
New CT scheduled (→ Students of the batch)
CT marks uploaded (→ Students of the batch)
New assignment created (→ Students of the batch)
Semester promotion request submitted (→ Admin)
Semester promoted (→ Students and CR of the batch)
Holiday declared (→ All users)
New resource uploaded (→ Students of relevant semester)
New result published (→ Students of the batch)
Notifications appear as a badge count on the navigation bar and are listed in a notifications panel.
Users can mark notifications as read. Unread notifications are highlighted.
 
 
3.2 Non-Functional Requirements
3.2.1 Performance
NFR ID
Requirement
Target
NFR-01
Page Load Time: All pages, including the dashboard, must load within an acceptable time frame on a standard broadband connection (10 Mbps).
≤ 3 seconds
NFR-02
API Response Time: All backend API endpoints must respond within an acceptable time for typical operations (CRUD, conflict checks).
≤ 500 milliseconds (95th percentile)
NFR-03
Concurrent Users: The system must support simultaneous active users without performance degradation, considering the department's scale (~500 students + ~31 teachers + admins).
200 concurrent users
NFR-04
Database Query Optimization: Complex queries (e.g., conflict detection across all rooms, teachers, and batches for a given time slot) must be optimized with proper indexing and query planning.
≤ 200 milliseconds per conflict check
NFR-05
File Upload/Download Speed: Resource uploads (up to 25 MB) and downloads must complete within a reasonable time.
≤ 10 seconds for 25 MB file
 
 
 
3.2.2 Security
NFR ID
Requirement
Description
NFR-06
Authentication Security: All passwords must be hashed using bcrypt with a minimum cost factor of 10. Plain-text passwords must never be stored or logged.
 
 
NFR-07
Authorization Enforcement: All API endpoints must enforce role-based access control (RBAC). A user must only be able to perform actions permitted by their role (Student, CR, Teacher, Admin).
 
 
NFR-08
JWT Security: JWT tokens must use a strong secret key (minimum 256-bit), include expiration claims (24-hour max), and be transmitted only over HTTPS. Refresh tokens must be stored securely.
 
 
NFR-09
Data Privacy: Student marks, personal information, and academic records must be accessible only to authorized users. Students can only see their own marks; teachers can only see marks for their courses.
 
 
NFR-10
Input Validation & Sanitization: All user inputs must be validated and sanitized on both client and server sides to prevent SQL injection, XSS (Cross-Site Scripting), and CSRF (Cross-Site Request Forgery) attacks.
 
 
NFR-11
HTTPS Enforcement: All communication between the client and server must be encrypted using TLS/SSL. HTTP requests must be redirected to HTTPS.
 
 
NFR-12
Audit Logging: All sensitive operations (login attempts, password changes, schedule modifications, role changes, semester promotions) must be logged with user ID, timestamp, IP address, and action details.
 
 
 
 
 
3.2.3 Reliability & Availability
NFR ID
Requirement
Target
NFR-13
System Uptime: The system must maintain high availability during the academic semester (excluding planned maintenance windows).
99.5% uptime
NFR-14
Data Backup: Automated daily backups of the PostgreSQL database must be configured. Backups must be retained for a minimum of 30 days.
Daily backups, 30-day retention
NFR-15
Error Handling: The system must handle all errors gracefully without exposing stack traces, internal paths, or database details to the end user. User-friendly error messages must be displayed.
 
 
NFR-16
Data Integrity: Database transactions must ensure ACID compliance. Concurrent modifications to the same schedule must be handled using optimistic locking or serializable transactions to prevent data corruption.
 
 
 
 
 
3.2.4 Usability
NFR ID
Requirement
Description
NFR-17
Responsive Design: The user interface must be fully responsive, providing an optimal viewing experience across devices — desktops (1920px), laptops (1366px), tablets (768px), and smartphones (320px–480px).
 
 
NFR-18
Intuitive Navigation: Users must be able to access any primary function (view schedule, check marks, cancel class) within 3 clicks from the dashboard. The navigation structure must be clear and consistent.
 
 
NFR-19
Accessibility: The system must comply with basic WCAG 2.1 Level AA guidelines, including sufficient color contrast, keyboard navigability, and screen reader compatibility for core functions.
 
 
NFR-20
Loading Indicators: All asynchronous operations (API calls, file uploads) must display visual loading indicators (spinners, progress bars) to provide feedback to the user.
 
 
NFR-21
Error Feedback: Form validation errors must be displayed inline next to the relevant field with clear, actionable error messages (e.g., "Password must be at least 8 characters" instead of "Invalid input").
 
 
 
 
 
3.2.5 Scalability
NFR ID
Requirement
Description
NFR-22
Modular Architecture: The system must be built with a modular architecture (separation of concerns) to allow individual modules (e.g., Resource Sharing, Result Management) to be extended or replaced independently.
 
 
NFR-23
Database Scalability: The database schema must be designed to handle growth in data volume (multiple semesters of historical data, increasing batch counts) without significant performance degradation. Archival strategies for old semester data must be supported.
 
 
NFR-24
Future Department Expansion: The system architecture must allow for potential future expansion to support multiple departments or university-wide deployment with minimal refactoring (e.g., through a multi-tenant database design or department scoping).
 
 
 
 
 
3.2.6 Maintainability
NFR ID
Requirement
Description
NFR-25
Code Quality: The codebase must follow consistent coding standards and conventions (ESLint for TypeScript/React, Prettier for formatting). All code must be type-safe (TypeScript strict mode).
 
 
NFR-26
Documentation: All API endpoints must be documented using OpenAPI/Swagger specification. Database schema must be documented with Prisma schema comments. Key business logic must include inline code comments.
 
 
NFR-27
Version Control: The project must use Git for version control with a clear branching strategy (e.g., Git Flow). Commits must follow conventional commit message format.
 
 
NFR-28
Database Migrations: All database schema changes must be managed through Prisma Migrate, ensuring reproducible and reversible migrations across development, staging, and production environments.
 
 
 
 
 
3.2.7 Quality
NFR ID
Requirement
Description
NFR-29
Testing Coverage: Critical business logic (conflict detection, semester promotion, authentication) must have unit test coverage of at least 80%. Integration tests must cover all API endpoints.
 
 
NFR-30
Cross-Browser Compatibility: The application must function correctly and display consistently on Chrome (v100+), Firefox (v100+), Edge (v100+), and Safari (v15+).
 
 
NFR-31
Data Validation Consistency: All data validation rules must be applied consistently on both the frontend (for user experience) and backend (for security). The backend must never trust client-side validation alone.