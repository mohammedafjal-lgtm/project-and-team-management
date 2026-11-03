'use client';

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;

/**
 * Refetches the current session and updates the internal store that
 * `useSession()` subscribes to. Call this after any mutation that changes
 * `user.activeTenantId` (tenant creation, tenant switch) so client-side
 * `useSession()` callers see the new value before navigation.
 */
export async function refreshSession() {
  await authClient.getSession();
}
