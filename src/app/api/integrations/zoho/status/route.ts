import { NextResponse } from "next/server";
import { requireApiTenantContext } from "@/lib/tenancy/resolve";
import { prisma } from "@/lib/db/prisma";
import { zohoConfigured } from "@/lib/zoho/config";

export async function GET() {
  const ctx = await requireApiTenantContext();
  const configured = zohoConfigured();
  const connection = configured
    ? await prisma.zohoConnection.findUnique({
        where: { tenantId: ctx.tenantId },
        select: { organizationId: true, connectedAt: true, apiBaseUrl: true },
      })
    : null;

  return NextResponse.json({
    configured,
    connected: Boolean(connection),
    organizationId: connection?.organizationId ?? null,
    connectedAt: connection?.connectedAt?.toISOString() ?? null,
  });
}
