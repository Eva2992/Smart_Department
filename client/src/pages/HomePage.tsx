import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth.js";

interface Facility {
  id: string;
  name: string;
  code: string;
  category: "classroom" | "computer_lab" | "specialized_lab" | "multipurpose";
  categoryLabel: string;
  description: string;
  capacity: string;
  features: string[];
}

interface AcademicProgram {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
}

interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  iconBgClass: string;
  iconColorClass: string;
}

interface RoleCardItem {
  id: string;
  roleTitle: string;
  badgeLabel: string;
  badgeClass: string;
  description: string;
  bulletPoints: string[];
}

const FACILITIES_DATA: Facility[] = [
  {
    id: "r101",
    name: "Lecture Classroom 101",
    code: "R-101",
    category: "classroom",
    categoryLabel: "Classroom",
    description:
      "Standard lecture classroom equipped for undergraduate and graduate course instruction.",
    capacity: "60 Seats",
    features: ["Acoustic Podia", "Multimedia Projection", "Whiteboard Array"],
  },
  {
    id: "r102",
    name: "Lecture Classroom 102",
    code: "R-102",
    category: "classroom",
    categoryLabel: "Classroom",
    description:
      "Standard lecture classroom dedicated to departmental theory courses and presentations.",
    capacity: "60 Seats",
    features: ["Digital Projector", "Tiered Seating", "Audio Amplification"],
  },
  {
    id: "r103",
    name: "Lecture Classroom 103",
    code: "R-103",
    category: "classroom",
    categoryLabel: "Classroom",
    description:
      "Standard lecture classroom supporting concurrent batch lectures and academic seminars.",
    capacity: "60 Seats",
    features: ["Smart Display", "Air Conditioned", "High-Gain Whiteboards"],
  },
  {
    id: "r201",
    name: "Computing Laboratory 201",
    code: "R-201",
    category: "computer_lab",
    categoryLabel: "Computer Lab",
    description:
      "High-capacity computer laboratory equipped for programming fundamentals and algorithms.",
    capacity: "45 Workstations",
    features: ["Gigabit LAN", "Dedicated Linux/Windows Terminals", "UPS Backup"],
  },
  {
    id: "r203",
    name: "Computing Laboratory 203",
    code: "R-203",
    category: "computer_lab",
    categoryLabel: "Computer Lab",
    description:
      "Advanced computing laboratory configured for database systems, compilers, and web development.",
    capacity: "45 Workstations",
    features: ["Development Servers", "Virtualization Workbenches", "Central Host System"],
  },
  {
    id: "r302",
    name: "Computing Laboratory 302",
    code: "R-302",
    category: "computer_lab",
    categoryLabel: "Computer Lab",
    description:
      "Senior research and computational laboratory dedicated to software engineering and data science.",
    capacity: "40 Workstations",
    features: ["GPU Compute Node Access", "High-Density Networking", "Presentation Screen"],
  },
  {
    id: "r105",
    name: "Electrical Circuit Lab",
    code: "R-105",
    category: "specialized_lab",
    categoryLabel: "Specialized Lab",
    description:
      "Specialized lab for electrical circuit experiments, digital logic, and microprocessor interfacing.",
    capacity: "35 Stations",
    features: ["Oscilloscopes & Trainers", "Breadboard Units", "IC Testers & Power Supplies"],
  },
  {
    id: "r202",
    name: "Multipurpose Hall",
    code: "R-202",
    category: "multipurpose",
    categoryLabel: "Multipurpose",
    description:
      "Flexible academic hall used for examinations, department seminars, and student defense workshops.",
    capacity: "100+ Capacity",
    features: ["Modular Seating", "Conference Audio", "Dual Presentation Displays"],
  },
];

const PROGRAMS_DATA: AcademicProgram[] = [
  {
    id: "bsc",
    title: "B.Sc. (Honours)",
    description: "4-year foundational undergraduate program",
    badge: "Undergraduate",
    badgeClass: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  },
  {
    id: "msc",
    title: "M.Sc.",
    description: "Master of Science in Computer Science & Engineering",
    badge: "Graduate",
    badgeClass: "bg-gray-100 text-[var(--color-text)]",
  },
  {
    id: "pmscs",
    title: "Professional M.Sc. (PMSCS)",
    description: "Executive postgraduate program for industry practitioners",
    badge: "Professional",
    badgeClass: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]",
  },
  {
    id: "mphil",
    title: "M.Phil.",
    description: "Master of Philosophy research degree",
    badge: "Research",
    badgeClass: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
  },
  {
    id: "phd",
    title: "Ph.D.",
    description: "Doctor of Philosophy in Computer Science",
    badge: "Doctoral",
    badgeClass: "bg-gray-800 text-white",
  },
];

const FEATURES_DATA: FeatureItem[] = [
  {
    id: "scheduling",
    icon: "⚡",
    title: "Conflict-free scheduling",
    description:
      "ACID-compliant real-time detection across room allocations, teacher timetables, and batch schedules, eliminating double-bookings instantaneously.",
    iconBgClass: "bg-[var(--color-primary)]/10",
    iconColorClass: "text-[var(--color-primary)]",
  },
  {
    id: "dashboards",
    icon: "👥",
    title: "Role-based dashboards",
    description:
      "Tailored operational environments for Student, CR, Teacher, and Admin, ensuring precise feature access aligned with departmental authority.",
    iconBgClass: "bg-gray-100",
    iconColorClass: "text-[var(--color-text)]",
  },
  {
    id: "cts",
    icon: "📝",
    title: "CT scheduling & marks tracking",
    description:
      "Transparent Class Test management with automated course-level aggregation policies (Best 3 of 4, Best N of M, or Average).",
    iconBgClass: "bg-[var(--color-secondary)]/10",
    iconColorClass: "text-[var(--color-secondary)]",
  },
  {
    id: "assignments",
    icon: "📋",
    title: "Assignment management",
    description:
      "Dual-mode submission handling supporting both online repository/Drive links and direct file uploads with deadline auditing.",
    iconBgClass: "bg-[var(--color-success)]/10",
    iconColorClass: "text-[var(--color-success)]",
  },
  {
    id: "resources",
    icon: "📚",
    title: "Resource sharing",
    description:
      "Structured repository of lecture slides, course materials, lab manuals, and previous year question banks organized by year and semester.",
    iconBgClass: "bg-[var(--color-gold)]/10",
    iconColorClass: "text-[var(--color-gold)]",
  },
  {
    id: "results",
    icon: "📊",
    title: "Semester result publishing",
    description:
      "Dual-hybrid publishing model: individual student course breakdown and GPA view alongside official downloadable batch result sheets.",
    iconBgClass: "bg-gray-100",
    iconColorClass: "text-[var(--color-text)]",
  },
  {
    id: "notifications",
    icon: "🔔",
    title: "In-app notifications",
    description:
      "Instant alerts dispatched for routine modifications, emergency room changes, newly scheduled CTs, assignments, and published semester results.",
    iconBgClass: "bg-[var(--color-primary)]/10",
    iconColorClass: "text-[var(--color-primary)]",
  },
];

const ROLES_DATA: RoleCardItem[] = [
  {
    id: "student",
    roleTitle: "Student",
    badgeLabel: "Student",
    badgeClass: "bg-gray-100 text-[var(--color-text-muted)]",
    description:
      "Personalized daily academic experience centered on personal course progress and timetable clarity.",
    bulletPoints: [
      "Personalized schedule & routine tracking",
      "CT & assignment submission tracker",
      "Continuous assessment marks & GPA view",
      "Course slides, notes, and past paper access",
    ],
  },
  {
    id: "cr",
    roleTitle: "Class Representative (CR)",
    badgeLabel: "Class Representative (CR)",
    badgeClass: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]",
    description:
      "Everything a student has, plus authority to coordinate batch timetables and manage academic deliverables.",
    bulletPoints: [
      "Batch routine management (reschedule, makeup, cancel)",
      "Daily actual class logging & seminar requests",
      "Study resource & syllabus uploads",
      "Semester final result sheet upload & promotion requests",
    ],
  },
  {
    id: "teacher",
    roleTitle: "Teacher",
    badgeLabel: "Teacher",
    badgeClass: "bg-[var(--color-text)]/10 text-[var(--color-text)]",
    description:
      "Comprehensive class management, assessment publishing, and cross-batch timetable overview.",
    bulletPoints: [
      "Multi-batch weekly schedule & timetable overview",
      "One-click slot reschedule with real-time conflict check",
      "CT scheduling & marks sheet upload",
      "Course assignment creation & submission reviews",
    ],
  },
  {
    id: "admin",
    roleTitle: "Admin",
    badgeLabel: "Admin",
    badgeClass: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
    description:
      "Full system control, baseline master routine generation, conflict resolution, and institutional roster governance.",
    bulletPoints: [
      "Master routine generation & room matrix governance",
      "Three-way conflict resolution & room deadlock overrides",
      "Preloaded student & teacher roster validation",
      "Batch promotion lifecycle & semester transitions",
    ],
  },
];

type FilterTab = "all" | "classroom" | "computer_lab" | "specialized_lab" | "multipurpose";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const [activeFacilityFilter, setActiveFacilityFilter] = useState<FilterTab>("all");

  const filteredFacilities =
    activeFacilityFilter === "all"
      ? FACILITIES_DATA
      : FACILITIES_DATA.filter((f) => f.category === activeFacilityFilter);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO SECTION                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28 border-b border-gray-200/70">
        {/* Subtle architectural brick-lattice accent texture (JU motif, restrained) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(var(--color-primary) 1px, transparent 1px), radial-gradient(var(--color-text) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px",
          }}
          aria-hidden="true"
        />

        {/* Subtle institutional ambient light accents */}
        <div
          className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full bg-gradient-to-br from-[var(--color-primary)]/8 via-[var(--color-secondary)]/5 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 rounded-full bg-gradient-to-tr from-[var(--color-success)]/8 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {/* Department & Faculty Identity */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-[var(--shadow-soft)] text-xs font-semibold text-[var(--color-text)] mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
              <span>Department of Computer Science &amp; Engineering</span>
              <span className="text-gray-300" aria-hidden="true">
                •
              </span>
              <span className="text-[var(--color-text-muted)]">Jahangirnagar University</span>
            </div>

            {/* Main Institutional Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[var(--color-text)] font-[Poppins] leading-[1.15]">
              Smart Department
            </h1>

            {/* Clear one-line positioning statement */}
            <p className="mt-4 text-base sm:text-xl font-medium text-[var(--color-text-muted)] max-w-2xl mx-auto leading-relaxed">
              Digital academic management for the JU CSE Department — orchestrating daily routines,
              conflict-free facilities, continuous assessments, and student records.
            </p>

            {/* Sub-line naming the four roles served */}
            <p className="mt-3 text-xs sm:text-sm text-[var(--color-text-muted)]">
              Unified operational workflows engineered for four key academic roles:
            </p>

            {/* Role Badges Strip */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-[var(--color-text-muted)] border border-gray-200">
                Student
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] border border-[var(--color-secondary)]/20">
                CR
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-text)]/10 text-[var(--color-text)] border border-[var(--color-text)]/20">
                Teacher
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                Admin
              </span>
            </div>

            {/* Primary & Secondary Call to Actions */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-[var(--radius-md)] shadow-[var(--shadow-soft)] transition-all cursor-pointer group"
                >
                  Go to Dashboard
                  <span
                    className="ml-2 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-[var(--radius-md)] shadow-[var(--shadow-soft)] transition-all cursor-pointer group"
                >
                  Log In
                  <span
                    className="ml-2 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              )}

              <a
                href="#about"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[var(--color-text)] bg-[var(--color-surface)] hover:bg-gray-50 border border-gray-200 rounded-[var(--radius-md)] shadow-xs transition-colors cursor-pointer"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. ABOUT THE DEPARTMENT SECTION                                    */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="about"
        className="py-16 sm:py-24 bg-[var(--color-surface)] border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Academic Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--color-primary)] uppercase">
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                  aria-hidden="true"
                />
                About the Department
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-text)] font-[Poppins] tracking-tight leading-tight">
                Pioneering Computing Education &amp; Research at Jahangirnagar
              </h2>

              <div className="space-y-4 text-sm sm:text-base text-[var(--color-text-muted)] leading-relaxed">
                <p>
                  The Department of Computer Science and Engineering was established in{" "}
                  <strong className="text-[var(--color-text)] font-semibold">1991</strong> (formerly
                  known as the{" "}
                  <em className="font-medium text-[var(--color-text)]">
                    Department of Electronics and Computer Science
                  </em>
                  ) under the prestigious{" "}
                  <strong className="text-[var(--color-text)] font-semibold">
                    Faculty of Mathematical and Physical Sciences
                  </strong>
                  .
                </p>
                <p>
                  As one of Bangladesh’s leading public university computer science faculties, the
                  department is currently chaired by{" "}
                  <strong className="text-[var(--color-text)] font-semibold">
                    Prof. Dr. Md. Golam Moazzam
                  </strong>{" "}
                  and is powered by approximately{" "}
                  <strong className="text-[var(--color-text)] font-semibold">
                    31 faculty members
                  </strong>{" "}
                  specializing across machine learning, software engineering, systems security, and
                  algorithms.
                </p>
                <p>
                  As of 2026, the department has produced over{" "}
                  <strong className="text-[var(--color-text)] font-semibold">
                    55+ undergraduate batches
                  </strong>{" "}
                  whose graduates lead technological innovation, academia, and research institutions
                  worldwide.
                </p>
              </div>

              {/* Campus architectural context note */}
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-bg)] border border-[var(--color-primary)]/15 flex items-start gap-3">
                <span className="text-xl" aria-hidden="true">
                  🏛️
                </span>
                <div className="text-xs text-[var(--color-text-muted)] leading-normal">
                  <strong className="text-[var(--color-text)]">
                    Red-Brick Campus &amp; Lake Ecology:
                  </strong>{" "}
                  Set within Jahangirnagar University’s expansive, sanctuary-protected residential
                  campus in Savar, the department pairs rigorous scientific training with JU’s rich
                  architectural heritage and natural biodiversity.
                </div>
              </div>
            </div>

            {/* Right Column: Degree Programs Offered */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 rounded-[var(--radius-lg)] bg-[var(--color-bg)] shadow-[var(--shadow-soft)]">
                <h3 className="text-lg font-bold text-[var(--color-text)] font-[Poppins] mb-4 flex items-center gap-2">
                  <span aria-hidden="true">🎓</span> Academic Programs Offered
                </h3>
                <p className="text-xs text-[var(--color-text-muted)] mb-6">
                  Comprehensive academic curricula recognized for rigorous mathematical rigor and
                  computational depth:
                </p>

                <ul className="space-y-3">
                  {PROGRAMS_DATA.map((prog) => (
                    <li
                      key={prog.id}
                      className="p-3.5 rounded-[14px] bg-[var(--color-surface)] shadow-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-sm font-bold text-[var(--color-text)] font-[Poppins]">
                          {prog.title}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {prog.description}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${prog.badgeClass}`}
                      >
                        {prog.badge}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. WHY SMART DEPARTMENT (SRS FEATURES GRID)                         */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="features"
        className="py-16 sm:py-24 bg-[var(--color-bg)] border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--color-primary)] uppercase mb-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                aria-hidden="true"
              />
              Department Operations
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-text)] font-[Poppins] tracking-tight">
              Why Smart Department
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--color-text-muted)]">
              Engineered strictly around verified departmental workflows and SRS requirements —
              eliminating friction without unnecessary complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES_DATA.map((feat, index) => {
              const isLast = index === FEATURES_DATA.length - 1;
              return (
                <div
                  key={feat.id}
                  className={`p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] hover:shadow-md transition-shadow ${
                    isLast ? "md:col-span-2 lg:col-span-3" : ""
                  }`}
                >
                  <div
                    className={`flex ${isLast ? "flex-col sm:flex-row items-start sm:items-center gap-4" : "flex-col"}`}
                  >
                    <div
                      className={`w-11 h-11 rounded-[14px] ${feat.iconBgClass} ${feat.iconColorClass} flex items-center justify-center text-xl font-bold shrink-0 ${
                        isLast ? "" : "mb-4"
                      }`}
                      aria-hidden="true"
                    >
                      {feat.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[var(--color-text)] font-[Poppins] mb-1.5">
                        {feat.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[var(--color-text-muted)] leading-relaxed">
                        {feat.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. BY THE NUMBERS (STAT STRIP)                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 sm:py-16 bg-[var(--color-surface)] border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--color-primary)] uppercase">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                aria-hidden="true"
              />
              By the Numbers
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Key operational and demographic scale of the CSE Department
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg)] shadow-[var(--shadow-soft)] text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[var(--color-primary)] font-[Poppins]">
                31
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[var(--color-text)]">
                faculty members
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                Professors, Associate &amp; Assistant Lecturers
              </div>
            </div>

            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg)] shadow-[var(--shadow-soft)] text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[var(--color-text)] font-[Poppins]">
                4 + 1
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[var(--color-text)]">
                4 active Honours batches + 1 active Masters batch
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                Concurrent semester cohorts tracked
              </div>
            </div>

            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg)] shadow-[var(--shadow-soft)] text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[var(--color-secondary)] font-[Poppins]">
                8
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[var(--color-text)]">
                8 managed rooms/labs
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                Classrooms, computer &amp; circuit labs
              </div>
            </div>

            <div className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-bg)] shadow-[var(--shadow-soft)] text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[var(--color-success)] font-[Poppins]">
                55+
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[var(--color-text)]">
                55+ batches produced
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">
                Graduating cohorts since 1991 founding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. FACILITIES SECTION                                               */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="facilities"
        className="py-16 sm:py-24 bg-[var(--color-bg)] border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--color-primary)] uppercase mb-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                aria-hidden="true"
              />
              Physical Infrastructure
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-text)] font-[Poppins] tracking-tight">
              Department Facilities
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--color-text-muted)]">
              The 8 physical spaces managed and conflict-checked by Smart Department: three standard
              lecture classrooms, three computing laboratories, one specialized electrical circuit
              lab, and one multipurpose hall.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div
            className="flex flex-wrap items-center justify-center gap-2 mb-8"
            role="tablist"
            aria-label="Filter facilities by room category"
          >
            {[
              { id: "all", label: "All Facilities (8)" },
              { id: "classroom", label: "Classrooms (3)" },
              { id: "computer_lab", label: "Computer Labs (3)" },
              { id: "specialized_lab", label: "Specialized Lab (1)" },
              { id: "multipurpose", label: "Multipurpose (1)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeFacilityFilter === tab.id}
                onClick={() => setActiveFacilityFilter(tab.id as FilterTab)}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all cursor-pointer ${
                  activeFacilityFilter === tab.id
                    ? "bg-[var(--color-text)] text-white shadow-xs"
                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Facilities Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredFacilities.map((facility) => (
              <div
                key={facility.id}
                className="p-6 rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-base sm:text-lg font-bold text-[var(--color-primary)] px-2.5 py-0.5 rounded-lg bg-[var(--color-primary)]/10">
                      {facility.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-[var(--color-text-muted)]">
                      {facility.categoryLabel}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[var(--color-text)] font-[Poppins] mb-1.5">
                    {facility.name}
                  </h3>

                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed mb-4">
                    {facility.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                  <div className="text-[11px] font-semibold text-[var(--color-text)] mb-2 flex items-center justify-between">
                    <span>Capacity:</span>
                    <span className="text-[var(--color-text-muted)] font-normal">
                      {facility.capacity}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {facility.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-[var(--color-bg)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-md"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 6. BUILT FOR EVERY ROLE (4 CARDS)                                   */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="roles"
        className="py-16 sm:py-24 bg-[var(--color-surface)] border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--color-primary)] uppercase mb-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"
                aria-hidden="true"
              />
              Role-Tailored Workflows
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--color-text)] font-[Poppins] tracking-tight">
              Built for Every Role
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--color-text-muted)]">
              Scattered paper routines and ad-hoc chat notifications replaced by focused,
              permission-bound operational dashboards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {ROLES_DATA.map((roleItem) => (
              <div
                key={roleItem.id}
                className="p-6 sm:p-7 rounded-[var(--radius-lg)] bg-[var(--color-bg)] shadow-[var(--shadow-soft)] flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${roleItem.badgeClass}`}
                  >
                    {roleItem.badgeLabel}
                  </div>
                  <h3 className="text-xl font-bold text-[var(--color-text)] font-[Poppins] mb-3">
                    {roleItem.roleTitle}
                  </h3>
                  <p className="text-xs text-[var(--color-text-muted)] mb-5 leading-relaxed">
                    {roleItem.description}
                  </p>

                  <ul className="space-y-2.5 text-xs text-[var(--color-text)]">
                    {roleItem.bulletPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[var(--color-success)] font-bold" aria-hidden="true">
                          ✓
                        </span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7. FOOTER CTA & DEPARTMENT DIRECTORY                                */}
      {/* ------------------------------------------------------------------ */}
      <footer className="bg-[var(--color-text)] text-white pt-16 pb-12 border-t-4 border-[var(--color-primary)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Institutional CTA Strip */}
          <div className="pb-12 border-b border-gray-700/80 mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-[Poppins] tracking-tight text-white">
                Access JU CSE Smart Department
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
                Authorized students and faculty members can authenticate immediately using preloaded
                university credentials.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="px-5 py-2.5 rounded-[var(--radius-md)] text-xs sm:text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-5 py-2.5 rounded-[var(--radius-md)] text-xs sm:text-sm font-semibold text-[var(--color-text)] bg-white hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Log In
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 rounded-[var(--radius-md)] text-xs sm:text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-colors cursor-pointer"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Directory Columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
            {/* Col 1: Identity */}
            <div className="md:col-span-8">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src="/smart-department-icon.svg"
                  alt="Smart Department"
                  className="w-9 h-9 object-contain brightness-110"
                />
                <div>
                  <span className="text-base font-bold text-white font-[Poppins] block leading-none">
                    Smart Department
                  </span>
                  <span className="text-[11px] text-gray-400">
                    JU CSE Academic Management System
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed max-w-lg">
                Department of Computer Science and Engineering, Faculty of Mathematical and Physical
                Sciences, Jahangirnagar University, Savar, Dhaka-1342, Bangladesh.
              </p>
              <p className="text-[11px] text-gray-500 mt-3">
                Established 1991 • Chaired by Prof. Dr. Md. Golam Moazzam
              </p>
            </div>

            {/* Col 2: Public Resources & Results Links */}
            <div className="md:col-span-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 font-[Poppins]">
                Public Access
              </h4>
              <ul className="space-y-2.5 text-xs text-gray-400">
                <li>
                  <Link
                    to="/resources"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span aria-hidden="true">📁</span>
                    <span>Browse Public Resources</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/results"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <span aria-hidden="true">📜</span>
                    <span>View Published Semester Results</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-8 border-t border-gray-800 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              © 1991–2026 Department of Computer Science &amp; Engineering, Jahangirnagar
              University.
            </div>
            <div>Smart Department Academic Operations Engine • All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
