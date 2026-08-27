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
