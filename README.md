
### Multi-tenancy: shared collections + enforced isolation

MongoDB does not provide row-level security. Isolation is enforced in three layers:

1. **`withTenant()` wrapper** — every tenant-scoped route handler runs inside `AsyncLocalStorage` with a verified `tenantId` from the session.
2. **Mongoose tenant plugin** — every query (`find`, `findOne`, `findOneAndUpdate`, `countDocuments`, `updateOne`, `deleteOne`, aggregates) is automatically scoped to the current `tenantId`. A query whose filter references a different tenant **throws** — it does not return empty results.
3. **Compound indexes** — every index leads with `tenantId` so queries are efficient at scale.

### Financial correctness

- **Invoice numbers** are allocated atomically via `findOneAndUpdate({ tenantId }, { $inc: { nextNumber: 1 } })`. Two concurrent finalisations never collide.
- **Journal entries** are validated for balance (`totalDebit === totalCredit`) in application code inside a transaction. Posted entries are immutable; corrections are reversals.
- **Razorpay webhooks** verify signatures against the **raw request body** with `timingSafeEqual`. Order and subscription payloads use inverted signature formats and have separate verifiers.
- **Idempotency** is guaranteed by a `webhook_events` collection with a unique index on `providerEventId`.
- **Tenant resolution in webhooks** reads `notes.tenant_id` from the Razorpay object — never from `req.user` or the user's current UI state.

---

## Getting started

### Prerequisites

- **Node.js 20+**
- **pnpm 10+**
- **MongoDB 6+** (local or Atlas)
- **Razorpay account** (test mode is fine)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd project-and-team-management
pnpm install