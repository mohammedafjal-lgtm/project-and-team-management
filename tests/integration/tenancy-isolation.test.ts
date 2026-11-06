import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";

/**
 * Data-layer tenant isolation.
 *
 * These tests verify the invariant the repositories rely on: any query that
 * is scoped by { tenantId } must only return rows that belong to that tenant,
 * and any lookup by primary key that is missing the tenantId filter must be
 * treated as a bug by the repositories (this test proves the database will
 * happily return data across tenants if the filter is omitted — the safety
 * comes from the repository layer, not from the DB).
 *
 * Request-layer isolation (subdomain → tenant, membership check, session
 * validation) is NOT tested here. That requires a live HTTP context and
 * belongs in a Playwright E2E test. Do not fake it in a Node test.
 */
describe("tenant isolation (data layer)", () => {
  let tenantA: { id: string; slug: string };
  let tenantB: { id: string; slug: string };
  let userA: { id: string; email: string };
  let clientA: { id: string };

  beforeAll(async () => {
    const suffix = Date.now().toString(36);

    tenantA = await prisma.tenant.create({
      data: { slug: `iso-a-${suffix}`, name: "Isolation A" },
    });
    tenantB = await prisma.tenant.create({
      data: { slug: `iso-b-${suffix}`, name: "Isolation B" },
    });

    userA = await prisma.user.create({
      data: { email: `iso-a-${suffix}@example.com`, name: "User A" },
    });

    await prisma.membership.create({
      data: { userId: userA.id, tenantId: tenantA.id, role: "OWNER", status: "ACTIVE" },
    });

    clientA = await prisma.client.create({
      data: { tenantId: tenantA.id, name: "Acme A" },
    });
  });

  afterAll(async () => {
    // Order matters: children before parents, or FK constraints block the delete.
    await prisma.client.deleteMany({
      where: { tenantId: { in: [tenantA.id, tenantB.id] } },
    });
    await prisma.membership.deleteMany({ where: { userId: userA.id } });
    await prisma.user.deleteMany({ where: { id: userA.id } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA.id, tenantB.id] } } });
    await prisma.$disconnect();
  });

  it("scopes client queries by tenantId", async () => {
    const clientsA = await prisma.client.findMany({ where: { tenantId: tenantA.id } });
    const clientsB = await prisma.client.findMany({ where: { tenantId: tenantB.id } });

    expect(clientsA).toHaveLength(1);
    expect(clientsA[0]?.name).toBe("Acme A");
    expect(clientsB).toHaveLength(0);
  });

  it("does not return client A when queried as tenant B by id + tenantId", async () => {
    const crossTenant = await prisma.client.findFirst({
      where: { id: clientA.id, tenantId: tenantB.id },
    });
    expect(crossTenant).toBeNull();
  });

  it("does not leak memberships across tenants", async () => {
    const inA = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: userA.id, tenantId: tenantA.id } },
    });
    const inB = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: userA.id, tenantId: tenantB.id } },
    });

    expect(inA?.role).toBe("OWNER");
    expect(inB).toBeNull();
  });

  it("documents that an unscoped findUnique WILL leak across tenants", async () => {
    // This is the hazard the repository layer protects against. If any code
    // queries by primary key without a tenantId filter, this is the shape of
    // the bug it will introduce. We assert the hazard exists so future
    // developers cannot "simplify" a scoped findFirst back to findUnique
    // without reading this test.
    const leak = await prisma.client.findUnique({ where: { id: clientA.id } });
    expect(leak?.tenantId).toBe(tenantA.id);
    // ^ If this ever becomes null, someone changed the schema.
    // ^ If someone adds a row that belongs to tenant B and we can see it via
    //   findUnique without a tenant filter, the repository layer has been
    //   weakened. The fix is not in this test — it is code review on every
    //   prisma.* call to ensure tenantId is always in the where clause.
  });
});