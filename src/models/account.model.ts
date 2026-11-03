import mongoose, { Schema, type Model } from 'mongoose';
import { tenantPlugin } from '@/plugins/mongoose-tenant';

export interface AccountDoc {
  tenantId: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<AccountDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      required: true,
    },
    normalBalance: { type: String, enum: ['debit', 'credit'], required: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AccountSchema.index({ tenantId: 1, code: 1 }, { unique: true });
AccountSchema.plugin(tenantPlugin);

export const Account: Model<AccountDoc> =
  (mongoose.models.Account as Model<AccountDoc> | undefined) ??
  mongoose.model<AccountDoc>('Account', AccountSchema);
