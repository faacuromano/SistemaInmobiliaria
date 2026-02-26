import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client/client.js";
import bcrypt from "bcryptjs";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // IMPORTANT: Change this password immediately after first login in production!
  const defaultPassword = process.env.SEED_ADMIN_PASSWORD || "Admin2026!Cambiar";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@inmobiliaria.com" },
    update: {},
    create: {
      email: "admin@inmobiliaria.com",
      password: hashedPassword,
      name: "Admin",
      lastName: "Sistema",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("Seed completado:", { id: admin.id, email: admin.email, role: admin.role });
  console.log("IMPORTANTE: Cambia la contraseña del admin en produccion!");
}

main().catch((e) => {
  console.error("Error en seed:", e);
  process.exit(1);
});
