import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, RoomType } from "@prisma/client";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export const FIXED_ROOMS = [
  {
    roomNumber: "R-101",
    type: RoomType.CLASSROOM,
    description: "Standard lecture classroom",
  },
  {
    roomNumber: "R-102",
    type: RoomType.CLASSROOM,
    description: "Standard lecture classroom",
  },
  {
    roomNumber: "R-103",
    type: RoomType.CLASSROOM,
    description: "Standard lecture classroom",
  },
  {
    roomNumber: "R-201",
    type: RoomType.COMPUTER_LAB,
    description: "Computer laboratory",
  },
  {
    roomNumber: "R-203",
    type: RoomType.COMPUTER_LAB,
    description: "Computer laboratory",
  },
  {
    roomNumber: "R-302",
    type: RoomType.COMPUTER_LAB,
    description: "Computer laboratory",
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
  console.log("🌱 Seeding fixed departmental rooms...");
  for (const room of FIXED_ROOMS) {
    await prisma.room.upsert({
      where: { roomNumber: room.roomNumber },
      update: {
        type: room.type,
        description: room.description,
      },
      create: room,
    });
  }
  console.log(`✅ Seeded ${FIXED_ROOMS.length} fixed rooms successfully.`);

  console.log("🌱 Seeding academic batches...");
  const batch51 = await prisma.batch.upsert({
    where: { name: "51st" },
    update: {},
    create: {
      name: "51st",
      program: "HONOURS",
    },
  });

  const batch52 = await prisma.batch.upsert({
    where: { name: "52nd" },
    update: {},
    create: {
      name: "52nd",
      program: "HONOURS",
    },
  });

  const batch53 = await prisma.batch.upsert({
    where: { name: "53rd" },
    update: {},
    create: {
      name: "53rd",
      program: "HONOURS",
    },
  });
  console.log("✅ Seeded academic batches successfully.");

  console.log("🌱 Seeding preloaded teachers...");
  const preloadedTeachers = [
    {
      uniqueId: "T-JU-001",
      name: "Prof. Dr. Md. Golam Moazzam",
      email: "moazzam@juniv.edu",
      designation: "Professor & Chairman",
      isChairman: true,
    },
    {
      uniqueId: "T-JU-002",
      name: "Dr. Md. Ezharul Islam",
      email: "ezharul@juniv.edu",
      designation: "Professor",
      isChairman: false,
    },
    {
      uniqueId: "T-JU-003",
      name: "Dr. Mohammad Shorif Uddin",
      email: "shorif@juniv.edu",
      designation: "Professor",
      isChairman: false,
    },
  ];

  for (const t of preloadedTeachers) {
    await prisma.preloadedTeacher.upsert({
      where: { uniqueId: t.uniqueId },
      update: {
        name: t.name,
        email: t.email,
        designation: t.designation,
        isChairman: t.isChairman,
      },
      create: t,
    });
  }
  console.log(`✅ Seeded ${preloadedTeachers.length} preloaded teachers.`);

  console.log("🌱 Seeding preloaded students...");
  const preloadedStudents = [
    {
      universityId: "2020-1-60-001",
      name: "Abdullah Al Mamun",
      email: "student51_1@juniv.edu",
      batchId: batch51.id,
      program: "HONOURS" as const,
    },
    {
      universityId: "2020-1-60-002",
      name: "Fatima Tuz Zohra",
      email: "student51_2@juniv.edu",
      batchId: batch51.id,
      program: "HONOURS" as const,
    },
    {
      universityId: "2021-1-60-001",
      name: "Tahmid Hasan",
      email: "student52_1@juniv.edu",
      batchId: batch52.id,
      program: "HONOURS" as const,
    },
    {
      universityId: "2021-1-60-002",
      name: "Nusrat Jahan",
      email: "student52_2@juniv.edu",
      batchId: batch52.id,
      program: "HONOURS" as const,
    },
  ];

  for (const s of preloadedStudents) {
    await prisma.preloadedStudent.upsert({
      where: { universityId: s.universityId },
      update: {
        name: s.name,
        email: s.email,
        batchId: s.batchId,
        program: s.program,
      },
      create: s,
    });
  }
  console.log(`✅ Seeded ${preloadedStudents.length} preloaded students.`);
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
