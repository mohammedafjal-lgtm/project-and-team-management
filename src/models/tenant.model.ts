import mongoose, { Schema, type Model } from 'mongoose';

export interface TenantDoc {
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'business';
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<TenantDoc>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['free', 'pro', 'business'], default: 'free' },
  },
  { timestamps: true },
);

TenantSchema.index({ slug: 1 }, { unique: true });

export const Tenant: Model<TenantDoc> =
  (mongoose.models.Tenant as Model<TenantDoc> | undefined) ??
  mongoose.model<TenantDoc>('Tenant', TenantSchema);