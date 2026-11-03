import mongoose, { Schema, type Model } from 'mongoose';
import { tenantPlugin } from '@/plugins/mongoose-tenant';

export interface ProjectDoc {
  tenantId: string;
  name: string;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<ProjectDoc>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true },
);

ProjectSchema.index({ tenantId: 1, status: 1 });
ProjectSchema.plugin(tenantPlugin);

export const Project: Model<ProjectDoc> =
  (mongoose.models.Project as Model<ProjectDoc> | undefined) ??
  mongoose.model<ProjectDoc>('Project', ProjectSchema);
