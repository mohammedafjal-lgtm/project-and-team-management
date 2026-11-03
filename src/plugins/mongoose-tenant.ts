import type { Schema, Query } from 'mongoose';
import { getTenantId } from '@/lib/tenant/tenant-context';

export function tenantPlugin(schema: Schema) {
  const tenantScoped = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'countDocuments',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
  ];

  for (const op of tenantScoped) {
    schema.pre(op as never, function (this: Query<unknown, unknown>) {
      const tenantId = getTenantId();
      const filter = this.getFilter();

      if (filter.tenantId && filter.tenantId !== tenantId) {
        throw new Error('CROSS_TENANT_QUERY: Query tenantId does not match current context');
      }
      this.where({ tenantId });
    });
  }

  schema.pre('aggregate', function (this: { pipeline: () => unknown[] }) {
    const tenantId = getTenantId();
    this.pipeline().unshift({ $match: { tenantId } });
  });

  schema.pre('save', function (this: { isNew: boolean; tenantId?: string }) {
    if (this.isNew && !this.tenantId) {
      this.tenantId = getTenantId();
    } else if (!this.isNew && this.tenantId !== getTenantId()) {
      throw new Error('CROSS_TENANT_QUERY: Cannot save document across tenants');
    }
  });
}