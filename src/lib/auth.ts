import { betterAuth } from 'better-auth';
import { mongooseAdapter } from 'better-auth-mongoose';
import { nextCookies } from 'better-auth/next-js';
import mongoose, { Schema } from 'mongoose';
import { dbConnect } from '@/lib/db/mongoose';

/**
 * Builds the better-auth instance. Kept as a named function so its exact
 * return type is `Auth<{ database; emailAndPassword; plugins }>` — the
 * default generic `Auth<BetterAuthOptions>` is structurally incompatible
 * with a narrowed instance, so we never name `Auth` here at all.
 */
async function buildAuth() {
  await dbConnect();

  return betterAuth({
    database: mongooseAdapter(mongoose.connection, {
      schemas: {
        user: new Schema({
          activeTenantId: { type: String, index: true },
        }),
      },
    }),
    // Without this, getSession strips activeTenantId even when it exists on
    // the user document — the adapter only maps fields from this schema.
    user: {
      additionalFields: {
        activeTenantId: {
          type: 'string',
          required: false,
          input: false,
        },
      },
    },
    emailAndPassword: { enabled: true },
    plugins: [nextCookies()],
  });
}

// Cache the promise, not the instance. Two concurrent first-callers share one
// init, and TS narrows `authPromise` to non-null after `??=` because the
// assignment can't produce `null`.
let authPromise: ReturnType<typeof buildAuth> | null = null;

/**
 * Lazily initialised. Never `await dbConnect()` at module top-level — it
 * breaks `next build` in CI where MONGODB_URI is unset.
 */
export async function getAuth() {
  authPromise ??= buildAuth();
  return authPromise;
}
