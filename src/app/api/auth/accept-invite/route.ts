import { NextResponse } from "next/server";
import { z } from "zod";
import { setSessionCookie } from "@/lib/auth/session";
import { acceptInvitation } from "@/domains/team/team.service";

const Body = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await acceptInvitation(parsed.data);
    const response = NextResponse.json({ redirectTo: result.redirectTo });
    await setSessionCookie(response, {
      userId: result.user.id,
      email: result.user.email,
      activeTenantId: result.tenantId,
    });
    return response;
  } catch (err) {
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Failed to accept invite" },
      { status: 400 }
    );
  }
}
