import mongoose, { Schema, type Model } from 'mongoose';

export interface JournalCounterDoc {
  tenantId: string;
  nextNumber: number;
}

const JournalCounterSchema = new Schema<JournalCounterDoc>({
  tenantId: { type: String, required: true, unique: true },
  nextNumber: { type: Number, required: true, default: 0 },
});

export const JournalCounter: Model<JournalCounterDoc> =
  (mongoose.models.JournalCounter as Model<JournalCounterDoc> | undefined) ??
  mongoose.model<JournalCounterDoc>('JournalCounter', JournalCounterSchema);
