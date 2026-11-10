import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const rawEmail = process.env.OWNER_EMAIL?.trim().toLowerCase();
const rawPassword = process.env.OWNER_PASSWORD;
const ownerName = process.env.OWNER_NAME?.trim() || "Owner";
const tenantName = process.env.TENANT_NAME?.trim() || "Workspace";
const tenantSlug =
  process.env.TENANT_SLUG?.trim().toLowerCase() ||
  tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) ||
  "workspace";

if (!rawEmail || !rawPassword) {
  console.error("OWNER_EMAIL and OWNER_PASSWORD are required to seed.");
  process.exit(1);
}

const email: string = rawEmail;
const password: string = rawPassword;

if (password.length < 8) {
  console.error("OWNER_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    create: { name: tenantName, slug: tenantSlug },
    update: { name: tenantName },
  });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: ownerName,
      passwordHash,
      emailVerified: new Date(),
    },
    update: {
      name: ownerName,
      passwordHash,
      emailVerified: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_tenantId: { userId: user.id, tenantId: tenant.id },
    },
    create: {
      userId: user.id,
      tenantId: tenant.id,
      role: Role.OWNER,
      status: "ACTIVE",
    },
    update: {
      role: Role.OWNER,
      status: "ACTIVE",
    },
  });

  console.log(`Seeded OWNER ${email} for tenant ${tenant.slug} (${tenant.name})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
