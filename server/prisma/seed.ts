import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  RoomType,
  Role,
  Program,
  BatchStatus,
  SemesterStatus,
  ScheduleEntryType,
  ScheduleEntryStatus,
  HolidayScope,
} from "@prisma/client";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export const FIXED_ROOMS = [
  {
    roomNumber: "R-101",
    type: RoomType.CLASSROOM,
    description: "Standard lecture classroom (Capacity: 80)",
  },
  {
    roomNumber: "R-102",
    type: RoomType.CLASSROOM,
    description: "Standard lecture classroom (Capacity: 70)",
  },
  {
    roomNumber: "R-103",
    type: RoomType.CLASSROOM,
    description: "Standard lecture classroom (Capacity: 60)",
  },
  {
    roomNumber: "R-201",
    type: RoomType.COMPUTER_LAB,
    description: "Advanced Software & Network Lab",
  },
  {
    roomNumber: "R-203",
    type: RoomType.COMPUTER_LAB,
    description: "General Computational Lab",
  },
  {
    roomNumber: "R-302",
    type: RoomType.COMPUTER_LAB,
    description: "Data Science & AI Lab",
  },
  {
    roomNumber: "R-105",
    type: RoomType.ELECTRICAL_LAB,
    description: "Electrical circuit & hardware laboratory",
  },
  {
    roomNumber: "R-202",
    type: RoomType.MULTIPURPOSE,
    description: "Multipurpose room for exams, seminars, and workshops",
  },
];

export async function seed() {
  const roomMap = new Map<string, string>();
  console.log("🌱 Seeding fixed departmental rooms...");
  for (const room of FIXED_ROOMS) {
    const r = await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {
        type: room.type,
        description: room.description,
      },
      create: room,
    });
    roomMap.set(room.roomNumber, r.id);
  }
  console.log(`✅ Seeded ${FIXED_ROOMS.length} fixed rooms.`);

  // 2. Seed Batches
  const batch52 = await prisma.batch.upsert({
    where: { name: "52nd" },
    update: {},
    create: {
      name: "52nd",
      program: Program.HONOURS,
      status: BatchStatus.ACTIVE,
    },
  });

  const batch51 = await prisma.batch.upsert({
    where: { name: "51st" },
    update: {},
    create: {
      name: "51st",
      program: Program.HONOURS,
      status: BatchStatus.ACTIVE,
    },
  });
  console.log("✅ Seeded Batches (51st, 52nd).");

  // 3. Seed Semesters
  const sem42 = await prisma.semester.upsert({
    where: { id: "sem-42-52nd" },
    update: {},
    create: {
      id: "sem-42-52nd",
      name: "4th Year 2nd Semester",
      batchId: batch52.id,
      startDate: new Date("2026-07-01"),
      endDate: new Date("2026-12-31"),
      status: SemesterStatus.ACTIVE,
    },
  });

  // Update Batch current semester
  await prisma.batch.update({
    where: { id: batch52.id },
    data: { currentSemesterId: sem42.id },
  });

  // 4. Seed Users (Admin, Teachers, CR, Student)
  const passwordHash = "$2a$10$SampleHashedPasswordForSeed123456789"; // demo hash

  const admin = await prisma.user.upsert({
    where: { email: "admin@juniv.edu" },
    update: {},
    create: {
      id: "user-admin-1",
      name: "Department Office Admin",
      email: "admin@juniv.edu",
      passwordHash,
      role: Role.ADMIN,
      isVerified: true,
    },
  });

  const teacherAnup = await prisma.user.upsert({
    where: { email: "anup.cse@juniv.edu" },
    update: {},
    create: {
      id: "teacher-anup-1",
      name: "Dr. Anup Kumar",
      email: "anup.cse@juniv.edu",
      teacherUniqueId: "JU-CSE-T01",
      passwordHash,
      role: Role.TEACHER,
      isVerified: true,
    },
  });

  const teacherFarhana = await prisma.user.upsert({
    where: { email: "farhana.cse@juniv.edu" },
    update: {},
    create: {
      id: "teacher-farhana-2",
      name: "Dr. Farhana",
      email: "farhana.cse@juniv.edu",
      teacherUniqueId: "JU-CSE-T02",
      passwordHash,
      role: Role.TEACHER,
      isVerified: true,
    },
  });

  const studentCR = await prisma.user.upsert({
    where: { email: "cr.52@juniv.edu" },
    update: {},
    create: {
      id: "user-cr-52",
      name: "Rahim Ahmed (CR)",
      email: "cr.52@juniv.edu",
      universityId: "20220104052",
      passwordHash,
      role: Role.CR,
      batchId: batch52.id,
      program: Program.HONOURS,
      isVerified: true,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "student.52@juniv.edu" },
    update: {},
    create: {
      id: "user-student-52",
      name: "Tanvir Hasan",
      email: "student.52@juniv.edu",
      universityId: "20220104053",
      passwordHash,
      role: Role.STUDENT,
      batchId: batch52.id,
      program: Program.HONOURS,
      isVerified: true,
    },
  });

  console.log("✅ Seeded Users (Admin, Teachers, CR, Student).");

  // 5. Seed Courses
  const courseSE = await prisma.course.upsert({
    where: { id: "course-cse-404" },
    update: {},
    create: {
      id: "course-cse-404",
      name: "Software Engineering",
      code: "CSE 404",
      creditHours: 3.0,
      semesterId: sem42.id,
      teacherId: teacherAnup.id,
    },
  });

  const courseDB = await prisma.course.upsert({
    where: { id: "course-cse-301" },
    update: {},
    create: {
      id: "course-cse-301",
      name: "Database Systems",
      code: "CSE 301",
      creditHours: 3.0,
      semesterId: sem42.id,
      teacherId: teacherFarhana.id,
    },
  });
  console.log("✅ Seeded Courses.");

  // 6. Seed Schedule Entries
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const start1 = new Date(today);
  start1.setUTCHours(9, 0, 0, 0);
  const end1 = new Date(today);
  end1.setUTCHours(10, 30, 0, 0);

  const start2 = new Date(today);
  start2.setUTCHours(11, 0, 0, 0);
  const end2 = new Date(today);
  end2.setUTCHours(12, 30, 0, 0);

  await prisma.scheduleEntry.upsert({
    where: { id: "entry-seed-1" },
    update: {},
    create: {
      id: "entry-seed-1",
      type: ScheduleEntryType.CLASS,
      status: ScheduleEntryStatus.SCHEDULED,
      courseId: courseSE.id,
      batchId: batch52.id,
      teacherId: teacherAnup.id,
      roomId: roomMap.get("R-101") || "",
      date: today,
      startTime: start1,
      endTime: end1,
      createdById: admin.id,
    },
  });

  await prisma.scheduleEntry.upsert({
    where: { id: "entry-seed-2" },
    update: {},
    create: {
      id: "entry-seed-2",
      type: ScheduleEntryType.CLASS,
      status: ScheduleEntryStatus.SCHEDULED,
      courseId: courseDB.id,
      batchId: batch52.id,
      teacherId: teacherFarhana.id,
      roomId: roomMap.get("R-102") || "",
      date: today,
      startTime: start2,
      endTime: end2,
      createdById: admin.id,
    },
  });

  // 7. Seed Holiday
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  await prisma.holiday.upsert({
    where: { id: "holiday-seed-1" },
    update: {},
    create: {
      id: "holiday-seed-1",
      date: nextWeek,
      reason: "University Foundation Day",
      scope: HolidayScope.ALL,
    },
  });

  console.log("✅ Seeded Demo Schedule Entries and Holiday.");
}

if (process.env.NODE_ENV !== "test") {
  seed()
    .catch((e) => {
      console.error("❌ Seeding failed:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
