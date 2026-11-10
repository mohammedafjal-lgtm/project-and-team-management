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
  const root =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "";
  const host = root.split(":")[0];
  if (!host) return undefined;
  // IPv4 doesn't support subdomain cookies; subdomain routing won't work either.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined;
  // `.localhost` is accepted by modern browsers and shares across *.localhost.
  return `.${host}`;
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
  // Use set() with maxAge: 0 so we clear the same Domain/Secure/Path attributes
  // the cookie was originally set with. Plain cookies().delete() deletes a
  // host-only cookie and leaves the production domain cookie behind.
  (await cookies()).set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    domain: cookieDomain(),
    path: "/",
    maxAge: 0,
  });
}