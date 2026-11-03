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
  ] as const;

  for (const op of tenantScoped) {
    schema.pre(op, function (this: Query<unknown, unknown>) {
      // Escape hatch: `.setOptions({ skipTenantGuard: true })` on the query.
      // Only use for admin/system paths where the tenant is derived separately
      // and the query explicitly filters tenantId itself.
      if (this.getOptions().skipTenantGuard === true) return;

      const tenantId = getTenantId();
      const filter = this.getFilter() as { tenantId?: string };

      if (filter.tenantId && filter.tenantId !== tenantId) {
        throw new Error('CROSS_TENANT_QUERY: Query tenantId does not match current context');
      }
      this.where({ tenantId });
    });
  }

  schema.pre('aggregate', function () {
    const opts = (this as unknown as { options?: Record<string, unknown> }).options;
    if (opts?.skipTenantGuard === true) return;

    const tenantId = getTenantId();
    this.pipeline().unshift({ $match: { tenantId } });
  });

  // Must run on validate (not save): Mongoose validates before pre('save'),
  // so injecting tenantId in save is too late for required:true fields.
  schema.pre('validate', function (this: { isNew: boolean; tenantId?: string }) {
    if (this.isNew && !this.tenantId) {
      this.tenantId = getTenantId();
    } else if (!this.isNew && this.tenantId !== getTenantId()) {
      throw new Error('CROSS_TENANT_QUERY: Cannot save document across tenants');
    }
  });
}
