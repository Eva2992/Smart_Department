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
  capacity?: string;
  features: string[];
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

type FilterTab = "all" | "classroom" | "computer_lab" | "specialized_lab" | "multipurpose";

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const [activeFacilityFilter, setActiveFacilityFilter] = useState<FilterTab>("all");

  const filteredFacilities =
    activeFacilityFilter === "all"
      ? FACILITIES_DATA
      : FACILITIES_DATA.filter((f) => f.category === activeFacilityFilter);

  return (
    <div className="min-h-screen bg-[#FFFBFA] text-[#1F2937]">
      {/* ------------------------------------------------------------------ */}
      {/* 1. HERO SECTION                                                    */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 border-b border-gray-200/70">
        {/* Atmospheric Red-brick & Lake Green geometric accents (JU motif) */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#DC143C 1px, transparent 1px), radial-gradient(#1E3A5F 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
            backgroundPosition: "0 0, 16px 16px",
          }}
          aria-hidden="true"
        />

        {/* Ambient architectural gradient glows (warm brick red & deep lake blue) */}
        <div
          className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 rounded-full bg-gradient-to-br from-[#DC143C]/10 via-[#DA532C]/5 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 rounded-full bg-gradient-to-tr from-[#1E3A5F]/10 via-[#16A34A]/5 to-transparent blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            {/* Department & Faculty Identity Chip */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3A5F]/5 border border-[#1E3A5F]/15 text-xs font-semibold text-[#1E3A5F] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#DC143C]" aria-hidden="true" />
              <span>Department of Computer Science &amp; Engineering</span>
              <span className="text-gray-300">•</span>
              <span>Jahangirnagar University</span>
            </div>

            {/* Main Institutional Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1F2937] font-[Poppins] leading-[1.15]">
              Smart Department
            </h1>

            {/* Clear one-line positioning statement */}
            <p className="mt-4 text-base sm:text-xl font-medium text-[#4B5563] max-w-2xl mx-auto leading-relaxed">
              Digital academic management for the JU CSE Department — orchestrating daily routines,
              conflict-free facilities, continuous assessments, and student records.
            </p>

            {/* Sub-line naming the four roles served */}
            <p className="mt-3 text-xs sm:text-sm text-[#6B7280]">
              Unified operational workflows engineered for four key academic roles:
            </p>

            {/* Role Badges Strip */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 shadow-xs">
                Student
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#DA532C]/10 text-[#DA532C] border border-[#DA532C]/30 shadow-xs">
                Class Representative (CR)
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#1F2937]/10 text-[#1F2937] border border-[#1F2937]/30 shadow-xs">
                Teacher
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#DC143C]/10 text-[#DC143C] border border-[#DC143C]/30 shadow-xs">
                Admin
              </span>
            </div>

            {/* Primary & Secondary Call to Actions */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-[16px] shadow-[0_4px_12px_rgba(220,20,60,0.25)] transition-all cursor-pointer group"
                >
                  Go to Dashboard
                  <span className="ml-2 transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] rounded-[16px] shadow-[0_4px_12px_rgba(220,20,60,0.25)] transition-all cursor-pointer group"
                >
                  Sign In to Portal
                  <span className="ml-2 transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              )}

              <a
                href="#about"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-[#1F2937] bg-white hover:bg-gray-50 border border-gray-200 rounded-[16px] shadow-xs transition-colors cursor-pointer"
              >
                Learn More
              </a>
            </div>

            {/* Public Quick-Access Gateways */}
            <div className="mt-8 pt-6 border-t border-gray-200/60 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#6B7280]">
              <span className="font-medium text-gray-500">Public Gateways:</span>
              <Link
                to="/resources"
                className="font-semibold text-[#DC143C] hover:underline inline-flex items-center gap-1"
              >
                <span>📁</span> Department Study Resources
              </Link>
              <span className="text-gray-300" aria-hidden="true">
                •
              </span>
              <Link
                to="/results"
                className="font-semibold text-[#1E3A5F] hover:underline inline-flex items-center gap-1"
              >
                <span>📜</span> Semester Final Results
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 2. ABOUT THE DEPARTMENT SECTION                                    */}
      {/* ------------------------------------------------------------------ */}
      <section id="about" className="py-16 sm:py-24 bg-white border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left Column: Academic Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#DC143C] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C]" />
                About the Department
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1F2937] font-[Poppins] tracking-tight leading-tight">
                Pioneering Computing Education &amp; Research at Jahangirnagar
              </h2>

              <div className="space-y-4 text-sm sm:text-base text-[#4B5563] leading-relaxed">
                <p>
                  The Department of Computer Science and Engineering was established in{" "}
                  <strong className="text-[#1F2937] font-semibold">1991</strong> (formerly known as
                  the{" "}
                  <em className="font-medium text-[#1F2937]">
                    Department of Electronics and Computer Science
                  </em>
                  ) under the prestigious{" "}
                  <strong className="text-[#1F2937] font-semibold">
                    Faculty of Mathematical and Physical Sciences
                  </strong>
                  .
                </p>
                <p>
                  As one of Bangladesh’s leading public university computer science faculties, the
                  department is currently chaired by{" "}
                  <strong className="text-[#1F2937] font-semibold">
                    Prof. Dr. Md. Golam Moazzam
                  </strong>{" "}
                  and is powered by approximately{" "}
                  <strong className="text-[#1F2937] font-semibold">31 faculty members</strong>{" "}
                  specializing across machine learning, software engineering, systems security, and
                  algorithms.
                </p>
                <p>
                  As of 2026, the department has produced over{" "}
                  <strong className="text-[#1F2937] font-semibold">
                    55+ undergraduate batches
                  </strong>{" "}
                  whose graduates lead technological innovation, academia, and research institutions
                  worldwide.
                </p>
              </div>

              {/* Campus architectural context note */}
              <div className="p-4 rounded-[16px] bg-[#FFFBFA] border border-[#DC143C]/15 flex items-start gap-3">
                <div className="text-xl" aria-hidden="true">
                  🏛️
                </div>
                <div className="text-xs text-[#6B7280] leading-normal">
                  <strong className="text-[#1F2937]">Red-Brick Campus &amp; Lake Ecology:</strong>{" "}
                  Set within Jahangirnagar University’s expansive, sanctuary-protected residential
                  campus in Savar, the department pairs rigorous scientific training with JU’s rich
                  architectural heritage and natural biodiversity.
                </div>
              </div>
            </div>

            {/* Right Column: Degree Programs Offered */}
            <div className="lg:col-span-5">
              <div className="p-6 sm:p-8 rounded-[20px] bg-[#FFFBFA] border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
                <h3 className="text-lg font-bold text-[#1F2937] font-[Poppins] mb-4 flex items-center gap-2">
                  <span>🎓</span> Academic Programs Offered
                </h3>
                <p className="text-xs text-[#6B7280] mb-6">
                  Comprehensive academic curricula recognized for rigorous mathematical rigor and
                  computational depth:
                </p>

                <ul className="space-y-3.5">
                  <li className="p-3.5 rounded-[14px] bg-white border border-gray-200/60 shadow-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#1F2937] font-[Poppins]">
                        B.Sc. (Honours)
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        4-year foundational undergraduate program
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#DC143C]/10 text-[#DC143C]">
                      Undergraduate
                    </span>
                  </li>

                  <li className="p-3.5 rounded-[14px] bg-white border border-gray-200/60 shadow-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#1F2937] font-[Poppins]">M.Sc.</div>
                      <div className="text-xs text-[#6B7280]">
                        Master of Science in Computer Science &amp; Engineering
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1E3A5F]/10 text-[#1E3A5F]">
                      Graduate
                    </span>
                  </li>

                  <li className="p-3.5 rounded-[14px] bg-white border border-gray-200/60 shadow-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#1F2937] font-[Poppins]">
                        Professional M.Sc. (PMSCS)
                      </div>
                      <div className="text-xs text-[#6B7280]">
                        Executive postgraduate program for industry practitioners
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#DA532C]/10 text-[#DA532C]">
                      Professional
                    </span>
                  </li>

                  <li className="p-3.5 rounded-[14px] bg-white border border-gray-200/60 shadow-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#1F2937] font-[Poppins]">M.Phil.</div>
                      <div className="text-xs text-[#6B7280]">
                        Master of Philosophy research degree
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                      Research
                    </span>
                  </li>

                  <li className="p-3.5 rounded-[14px] bg-white border border-gray-200/60 shadow-xs flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-[#1F2937] font-[Poppins]">Ph.D.</div>
                      <div className="text-xs text-[#6B7280]">
                        Doctor of Philosophy in Computer Science
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                      Doctoral
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 3. WHY SMART DEPARTMENT (SRS FEATURES GRID)                         */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-16 sm:py-24 bg-[#FFFBFA] border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#DC143C] uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C]" />
              Department Operations
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1F2937] font-[Poppins] tracking-tight">
              Why Smart Department
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#6B7280]">
              Engineered strictly around verified departmental workflows and SRS requirements —
              eliminating friction without unnecessary complexity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Conflict-Free Scheduling */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-[14px] bg-[#DC143C]/10 text-[#DC143C] flex items-center justify-center text-xl mb-4 font-bold">
                ⚡
              </div>
              <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-2">
                Conflict-free scheduling
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                ACID-compliant real-time detection across room allocations, teacher timetables, and
                batch schedules, eliminating double-bookings instantaneously.
              </p>
            </div>

            {/* Feature 2: Role-based Dashboards */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-[14px] bg-[#1E3A5F]/10 text-[#1E3A5F] flex items-center justify-center text-xl mb-4 font-bold">
                👥
              </div>
              <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-2">
                Role-based dashboards
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Tailored operational environments for Student, CR, Teacher, and Admin, ensuring
                precise feature access aligned with departmental authority.
              </p>
            </div>

            {/* Feature 3: CT Scheduling & Marks Tracking */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-[14px] bg-[#DA532C]/10 text-[#DA532C] flex items-center justify-center text-xl mb-4 font-bold">
                📝
              </div>
              <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-2">
                CT scheduling &amp; marks tracking
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Transparent Class Test management with automated course-level aggregation policies
                (Best 3 of 4, Best N of M, or Average).
              </p>
            </div>

            {/* Feature 4: Assignment Management */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-[14px] bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mb-4 font-bold">
                📋
              </div>
              <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-2">
                Assignment management
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Dual-mode submission handling supporting both online repository/Drive links and
                direct file uploads with deadline auditing.
              </p>
            </div>

            {/* Feature 5: Resource Sharing */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-[14px] bg-indigo-50 text-indigo-700 flex items-center justify-center text-xl mb-4 font-bold">
                📚
              </div>
              <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-2">
                Resource sharing
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Structured repository of lecture slides, course materials, lab manuals, and previous
                year question banks organized by year and semester.
              </p>
            </div>

            {/* Feature 6: Semester Result Publishing */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-[14px] bg-amber-50 text-amber-700 flex items-center justify-center text-xl mb-4 font-bold">
                📊
              </div>
              <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-2">
                Semester result publishing
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Dual-hybrid publishing model: individual student course breakdown and GPA view
                alongside official downloadable batch result sheets.
              </p>
            </div>

            {/* Feature 7: In-App Notifications (Spans full row on md, or 1 card on lg) */}
            <div className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow md:col-span-2 lg:col-span-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-11 h-11 rounded-[14px] bg-rose-50 text-[#DC143C] flex items-center justify-center text-xl font-bold shrink-0">
                  🔔
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F2937] font-[Poppins] mb-1">
                    In-app notifications
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                    Instant alerts dispatched for routine modifications, emergency room changes,
                    newly scheduled CTs, assignments, and published semester results.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 4. BY THE NUMBERS (STAT STRIP)                                      */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 sm:py-16 bg-white border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#DC143C] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C]" />
              By the Numbers
            </div>
            <p className="text-xs text-[#6B7280] mt-1">
              Key operational and demographic scale of the CSE Department
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-[20px] bg-[#FFFBFA] border border-gray-200/80 text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#DC143C] font-[Poppins]">
                31
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[#1F2937]">
                faculty members
              </div>
              <div className="mt-0.5 text-[11px] text-[#6B7280]">
                Professors, Associate &amp; Assistant Lecturers
              </div>
            </div>

            <div className="p-6 rounded-[20px] bg-[#FFFBFA] border border-gray-200/80 text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#1E3A5F] font-[Poppins]">
                4 + 1
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[#1F2937]">
                4 active Honours batches + 1 active Masters batch
              </div>
              <div className="mt-0.5 text-[11px] text-[#6B7280]">
                Concurrent semester cohorts tracked
              </div>
            </div>

            <div className="p-6 rounded-[20px] bg-[#FFFBFA] border border-gray-200/80 text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#DA532C] font-[Poppins]">
                8
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[#1F2937]">
                8 managed rooms/labs
              </div>
              <div className="mt-0.5 text-[11px] text-[#6B7280]">
                Classrooms, computer &amp; circuit labs
              </div>
            </div>

            <div className="p-6 rounded-[20px] bg-[#FFFBFA] border border-gray-200/80 text-center">
              <div className="text-3xl sm:text-5xl font-extrabold text-[#16A34A] font-[Poppins]">
                55+
              </div>
              <div className="mt-2 text-xs sm:text-sm font-semibold text-[#1F2937]">
                55+ batches produced
              </div>
              <div className="mt-0.5 text-[11px] text-[#6B7280]">
                Graduating cohorts since 1991 founding
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 5. FACILITIES SECTION                                               */}
      {/* ------------------------------------------------------------------ */}
      <section id="facilities" className="py-16 sm:py-24 bg-[#FFFBFA] border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#DC143C] uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C]" />
              Physical Infrastructure
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1F2937] font-[Poppins] tracking-tight">
              Department Facilities
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#6B7280]">
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
                    ? "bg-[#1F2937] text-white shadow-xs"
                    : "bg-white text-[#4B5563] hover:text-[#1F2937] hover:bg-gray-100 border border-gray-200"
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
                className="p-6 rounded-[20px] bg-white border border-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-base sm:text-lg font-bold text-[#DC143C] px-2.5 py-0.5 rounded-lg bg-[#DC143C]/10 border border-[#DC143C]/20">
                      {facility.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {facility.categoryLabel}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#1F2937] font-[Poppins] mb-1.5">
                    {facility.name}
                  </h3>

                  <p className="text-xs text-[#6B7280] leading-relaxed mb-4">
                    {facility.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 mt-2">
                  <div className="text-[11px] font-semibold text-[#1F2937] mb-2 flex items-center justify-between">
                    <span>Capacity:</span>
                    <span className="text-[#6B7280] font-normal">{facility.capacity}</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {facility.features.map((feat, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-[#FFFBFA] border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md"
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
      <section id="roles" className="py-16 sm:py-24 bg-white border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center mb-14">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#DC143C] uppercase mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#DC143C]" />
              Role-Tailored Workflows
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#1F2937] font-[Poppins] tracking-tight">
              Built for Every Role
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#6B7280]">
              Scattered paper routines and ad-hoc chat notifications replaced by focused,
              permission-bound operational dashboards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Role 1: Student */}
            <div className="p-6 sm:p-7 rounded-[20px] bg-[#FFFBFA] border-2 border-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200 mb-4">
                  Student
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] font-[Poppins] mb-3">Student</h3>
                <p className="text-xs text-[#6B7280] mb-5 leading-relaxed">
                  Personalized daily academic experience centered on personal course progress and
                  timetable clarity.
                </p>

                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>Personalized schedule &amp; routine tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>CT &amp; assignment submission tracker</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>Continuous assessment marks &amp; GPA view</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#16A34A] font-bold">✓</span>
                    <span>Course slides, notes, and past paper access</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-200">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#1F2937] hover:text-[#DC143C] inline-flex items-center gap-1"
                >
                  Student Portal Access →
                </Link>
              </div>
            </div>

            {/* Role 2: CR */}
            <div className="p-6 sm:p-7 rounded-[20px] bg-[#FFFBFA] border-2 border-[#DA532C]/30 shadow-[0_4px_12px_rgba(218,83,44,0.06)] flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#DA532C]/10 text-[#DA532C] border border-[#DA532C]/30 mb-4">
                  Class Representative
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] font-[Poppins] mb-3">
                  Class Representative (CR)
                </h3>
                <p className="text-xs text-[#6B7280] mb-5 leading-relaxed">
                  Everything a student has, plus authority to coordinate batch timetables and manage
                  academic deliverables.
                </p>

                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#DA532C] font-bold">✓</span>
                    <span>Batch routine management (reschedule, makeup, cancel)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#DA532C] font-bold">✓</span>
                    <span>Daily actual class logging &amp; seminar requests</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#DA532C] font-bold">✓</span>
                    <span>Study resource &amp; syllabus uploads</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#DA532C] font-bold">✓</span>
                    <span>Semester final result sheet upload &amp; promotion requests</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-[#DA532C]/20">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#DA532C] hover:underline inline-flex items-center gap-1"
                >
                  CR Portal Access →
                </Link>
              </div>
            </div>

            {/* Role 3: Teacher */}
            <div className="p-6 sm:p-7 rounded-[20px] bg-[#FFFBFA] border-2 border-[#1F2937]/30 shadow-[0_4px_12px_rgba(31,41,55,0.06)] flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#1F2937]/10 text-[#1F2937] border border-[#1F2937]/30 mb-4">
                  Faculty Member
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] font-[Poppins] mb-3">Teacher</h3>
                <p className="text-xs text-[#6B7280] mb-5 leading-relaxed">
                  Comprehensive class management, assessment publishing, and cross-batch timetable
                  overview.
                </p>

                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#1F2937] font-bold">✓</span>
                    <span>Multi-batch weekly schedule &amp; timetable overview</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#1F2937] font-bold">✓</span>
                    <span>One-click slot reschedule with real-time conflict check</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#1F2937] font-bold">✓</span>
                    <span>CT scheduling &amp; marks sheet upload</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#1F2937] font-bold">✓</span>
                    <span>Course assignment creation &amp; submission reviews</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1F2937]/20">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#1F2937] hover:underline inline-flex items-center gap-1"
                >
                  Faculty Portal Access →
                </Link>
              </div>
            </div>

            {/* Role 4: Admin */}
            <div className="p-6 sm:p-7 rounded-[20px] bg-[#FFFBFA] border-2 border-[#DC143C]/30 shadow-[0_4px_12px_rgba(220,20,60,0.06)] flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#DC143C]/10 text-[#DC143C] border border-[#DC143C]/30 mb-4">
                  Administration
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] font-[Poppins] mb-3">Admin</h3>
                <p className="text-xs text-[#6B7280] mb-5 leading-relaxed">
                  Full system control, baseline master routine generation, conflict resolution, and
                  institutional roster governance.
                </p>

                <ul className="space-y-2.5 text-xs text-[#4B5563]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#DC143C] font-bold">✓</span>
                    <span>Master routine generation &amp; room matrix governance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#DC143C] font-bold">✓</span>
                    <span>Three-way conflict resolution &amp; room deadlock overrides</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#DC143C] font-bold">✓</span>
                    <span>Preloaded student &amp; teacher roster validation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#DC143C] font-bold">✓</span>
                    <span>Batch promotion lifecycle &amp; semester transitions</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-[#DC143C]/20">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-[#DC143C] hover:underline inline-flex items-center gap-1"
                >
                  Admin Control Portal →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7. FOOTER CTA & DEPARTMENT DIRECTORY                                */}
      {/* ------------------------------------------------------------------ */}
      <footer className="bg-[#1F2937] text-white pt-16 pb-12 border-t-4 border-[#DC143C]">
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
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-[14px] text-xs sm:text-sm font-semibold text-[#1F2937] bg-white hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-[14px] text-xs sm:text-sm font-semibold text-white bg-[#DC143C] hover:bg-[#B01030] transition-colors cursor-pointer"
              >
                Register Account
              </Link>
            </div>
          </div>

          {/* Directory Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Identity */}
            <div className="md:col-span-2">
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
              <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                Department of Computer Science and Engineering, Faculty of Mathematical and Physical
                Sciences, Jahangirnagar University, Savar, Dhaka-1342, Bangladesh.
              </p>
              <p className="text-[11px] text-gray-500 mt-3">
                Established 1991 • Chaired by Prof. Dr. Md. Golam Moazzam
              </p>
            </div>

            {/* Col 2: Public Resources & Results */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 font-[Poppins]">
                Public Access
              </h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>
                  <Link to="/resources" className="hover:text-white transition-colors">
                    Course Resources &amp; Notes
                  </Link>
                </li>
                <li>
                  <Link to="/results" className="hover:text-white transition-colors">
                    Published Semester Results
                  </Link>
                </li>
                <li>
                  <a href="#facilities" className="hover:text-white transition-colors">
                    Classrooms &amp; Laboratories
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-white transition-colors">
                    Department Heritage &amp; Faculty
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Academic Portals */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 font-[Poppins]">
                Academic Portals
              </h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Student Login
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Class Representative (CR) Portal
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Faculty Timetable Login
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Department Administration
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
