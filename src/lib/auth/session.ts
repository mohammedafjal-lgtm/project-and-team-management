import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

const SESSION_COOKIE = "ptm_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);

export type SessionPayload = {
  userId: string;
  email: string;
  activeTenantId?: string;
};

/**
 * Cookie Domain for sharing the session across tenant subdomains.
 *
 * Browsers reject `Domain=localhost` / `Domain=.localhost`, so in local
 * development we omit Domain and rely on host-only cookies. That means
 * login / invite-accept must happen on the tenant host
 * (e.g. demo.localhost:3000), which is already how redirects work.
 */
function cookieDomain(): string | undefined {
  const root =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "";
  const host = root.split(":")[0];
  if (!host) return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined;
  if (host === "localhost" || host.endsWith(".localhost")) return undefined;
  return `.${host}`;
}

function sessionCookieBase() {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    domain: cookieDomain(),
    path: "/",
  };
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Attach a session cookie to a Route Handler response (preferred). */
export async function setSessionCookie(
  response: NextResponse,
  payload: SessionPayload
) {
  const token = await signSession(payload);
  response.cookies.set(SESSION_COOKIE, token, {
    ...sessionCookieBase(),
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

/** Clear the session cookie on a Route Handler response (preferred). */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieBase(),
    maxAge: 0,
  });
  return response;
}

/** Server Actions / pages that cannot build a NextResponse themselves. */
export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    ...sessionCookieBase(),
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
  (await cookies()).set(SESSION_COOKIE, "", {
    ...sessionCookieBase(),
    maxAge: 0,
  });
}
