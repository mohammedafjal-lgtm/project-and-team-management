import mongoose, { Schema, type Model } from 'mongoose';

export type MembershipRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface MembershipDoc {
  userId: string;
  tenantId: string;
  role: MembershipRole;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<MembershipDoc>(
  {
    userId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      required: true,
    },
  },
  { timestamps: true },
);

MembershipSchema.index({ userId: 1, tenantId: 1 }, { unique: true });

// NOTE: deliberately does NOT use tenantPlugin. Membership is looked up
// during tenant bootstrap (in withTenant) BEFORE any tenant context exists.
// Every query against this collection must filter tenantId explicitly.

export const Membership: Model<MembershipDoc> =
  (mongoose.models.Membership as Model<MembershipDoc> | undefined) ??
  mongoose.model<MembershipDoc>('Membership', MembershipSchema);