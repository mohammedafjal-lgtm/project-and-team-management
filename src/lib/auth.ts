import { betterAuth } from 'better-auth';
import { mongooseAdapter } from 'better-auth-mongoose';
import { nextCookies } from 'better-auth/next-js';
import mongoose, { Schema } from 'mongoose';
import { dbConnect } from '@/lib/db/mongoose';

await dbConnect();

export const auth = betterAuth({
  database: mongooseAdapter(mongoose.connection, {
    schemas: {
      user: new Schema({
        activeTenantId: { type: String, index: true },
      }),
    },
  }),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});