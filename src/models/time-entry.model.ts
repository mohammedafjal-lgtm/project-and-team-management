import mongoose, { Schema, type Model } from 'mongoose';
import { tenantPlugin } from '@/plugins/mongoose-tenant';

export interface TimeEntryDoc {
  tenantId: string;
  userId: string;
  projectId: string;
  description: string;
  startedAt: Date;
  endedAt?: Date;
  billable: boolean;
  workDate: string; // "YYYY-MM-DD" in workTimezone
  workTimezone: string; // IANA zone, e.g. "Asia/Kolkata"
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimeEntrySchema = new Schema<TimeEntryDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    billable: { type: Boolean, default: true },
    workDate: { type: String, required: true },
    workTimezone: { type: String, required: true },
    approvedAt: { type: Date },
    approvedBy: { type: String },
  },
  { timestamps: true },
);

TimeEntrySchema.index({ tenantId: 1, userId: 1, workDate: 1 });
TimeEntrySchema.index({ tenantId: 1, projectId: 1, billable: 1 });
TimeEntrySchema.plugin(tenantPlugin);

export const TimeEntry: Model<TimeEntryDoc> =
  (mongoose.models.TimeEntry as Model<TimeEntryDoc> | undefined) ??
  mongoose.model<TimeEntryDoc>('TimeEntry', TimeEntrySchema);
