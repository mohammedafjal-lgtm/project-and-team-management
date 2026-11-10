import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const email = "owner@example.com";
  const password = "password123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Seed skipped: user already exists");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const { user, tenant } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, passwordHash, name: "Owner" } });
    const tenant = await tx.tenant.create({ data: { slug: "demo", name: "Demo Co" } });
    await tx.membership.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER", status: "ACTIVE" },
    });
    return { user, tenant };
  });

  const client = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      name: "Acme Corp",
      email: "billing@acme.test",
      currency: "USD",
      defaultRateCents: 15000,
      taxRateBps: 825,
    },
  });

  const project = await prisma.project.create({
    data: {
      tenantId: tenant.id,
      clientId: client.id,
      name: "Website redesign",
      code: "ACME-001",
      budgetType: "HOURS",
      budgetMinutes: 60 * 40,
    },
  });

  await prisma.task.createMany({
    data: [
      { tenantId: tenant.id, projectId: project.id, title: "Design home page", createdBy: user.id },
      { tenantId: tenant.id, projectId: project.id, title: "Build checkout flow", createdBy: user.id },
      { tenantId: tenant.id, projectId: project.id, title: "QA & launch", createdBy: user.id },
    ],
  });

  console.log("Seed complete.");
  console.log("  Email:    " + email);
  console.log("  Password: " + password);
  console.log("  Tenant:   " + tenant.slug + ".localhost:3000");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());