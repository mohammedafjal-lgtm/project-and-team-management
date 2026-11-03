'use client';

import { useSession } from '@/lib/auth-client';

/**
 * Returns the signed-in user's active tenant id, or undefined while the
 * session is loading or if the user has no tenant yet.
 *
 * No redirects happen here: `(app)/layout.tsx` is the authoritative gate
 * (redirects to /login or /onboarding server-side). Client-side redirects
 * here would race against that authority and cause redirect ping-pong when
 * a session mutation lands mid-navigation.
 *
 * Query hooks already gate on `enabled: !!tenantId`, so while this is
 * undefined the page degrades to "loading" rather than firing unauthorised
 * requests.
 */
export function useActiveTenant() {
  const { data: session, isPending } = useSession();
  const activeTenantId = (session?.user as { activeTenantId?: string } | undefined)?.activeTenantId;

  return { activeTenantId, session, isPending };
}
