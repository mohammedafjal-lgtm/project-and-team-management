import { Account } from '@/models/account.model';

interface DefaultAccount {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  normalBalance: 'debit' | 'credit';
}

const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' },
  {
    code: '1100',
    name: 'Accounts Receivable',
    type: 'asset',
    normalBalance: 'debit',
  },
  { code: '4000', name: 'Service Revenue', type: 'revenue', normalBalance: 'credit' },
];

/**
 * Idempotently seed the system chart of accounts for a new tenant.
 *
 * Safe to call without tenantStorage context: Account's pre('save') hook only
 * calls getTenantId() when the document is new AND tenantId is missing — we
 * always pass it explicitly. Duplicate inserts are caught and ignored.
 */
export async function seedSystemAccounts(tenantId: string): Promise<void> {
  for (const d of DEFAULT_ACCOUNTS) {
    try {
      await Account.create({ ...d, tenantId, isSystem: true });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code?: number }).code === 11000
      ) {
        continue;
      }
      throw err;
    }
  }
}
