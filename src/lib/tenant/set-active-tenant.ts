import mongoose from 'mongoose';

/**
 * Persists `user.activeTenantId` on the Better Auth user document.
 *
 * Must run after `getAuth()` so the `user` model is registered. Do not write
 * to `collection('user')` — Mongoose registers the model as `"user"` but stores
 * it in the pluralized `"users"` collection, so a raw singular write is a
 * silent no-op and leaves onboarding stuck after workspace create.
 */
export async function setUserActiveTenant(userId: string, tenantId: string) {
  const User = mongoose.connection.models.user;
  if (!User) {
    throw new Error('User model is not registered; call getAuth() first');
  }

  const result = await User.updateOne({ _id: userId }, { $set: { activeTenantId: tenantId } });
  if (result.matchedCount === 0) {
    throw new Error(`No user matched id ${userId} when setting activeTenantId`);
  }
}
