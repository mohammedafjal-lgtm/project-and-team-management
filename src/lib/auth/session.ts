import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "ptm_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export type SessionPayload = {
  userId: string;
  email: string;
  activeTenantId?: string;
};

function cookieDomain(): string | undefined {
  if (process.env.NODE_ENV !== "production") return undefined;
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "";
  const host = root.split(":")[0];
  return host ? `.${host}` : undefined;
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: cookieDomain(),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}