# Project & Team Management

> An all-in-one workspace for projects, teams, time tracking, invoicing, and bookkeeping — with a keyboard-first UI inspired by Notion, Resend, and Vercel.

<p align="left">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb" />
  <img alt="Better Auth" src="https://img.shields.io/badge/Better_Auth-Mongoose-000" />
  <img alt="Razorpay" src="https://img.shields.io/badge/Razorpay-Billing-0C2451" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue" />
</p>

---

## What it is

A **multi-tenant SaaS** for small agencies and consultancies that want project management, time tracking, invoicing, and bookkeeping in one place — without stitching together five tools.

Every action is reachable by keyboard. The command palette (`⌘K`) is the primary navigation layer, not a hidden power-user feature.

**Core modules:**

| Module | What it does |
|---|---|
| **Projects & tasks** | Create projects, assign tasks, track status and due dates |
| **Time logging** | Manual entries and a start/stop timer, per-project, with billable flags |
| **Timesheets** | Weekly views with timezone-correct day bucketing and approval workflow |
| **Invoices** | Draft invoices from approved billable time, atomic numbering, PDF export |
| **Bookkeeping** | Double-entry general ledger, chart of accounts, trial balance, P&L |
| **Billing** | Razorpay subscriptions with order-based fallback for RBI e-mandate restrictions |
| **Teams** | Multi-tenant organizations, invitations, role-based access (Owner/Admin/Member/Viewer) |

---

## Design principles

1. **Keyboard first.** Every action is reachable via `⌘K`. Every shortcut is discoverable in the palette.
2. **Financial correctness over feature velocity.** Every financial event posts a balanced journal entry. Posted entries are immutable; corrections are reversals.
3. **Tenant isolation is enforced, not assumed.** MongoDB has no row-level security, so isolation is enforced at the ORM layer with a mandatory plugin that fails closed on any cross-tenant query.
4. **Fail loudly, not silently.** A missing `tenantId` filter throws a runtime error instead of returning empty results. Bugs surface in development, not as a data leak in production.
5. **Money is integer paise.** No floats. No `NaN`. Ever.
6. **Time is calendar-aware.** Time entries store `workDate` and `workTimezone` at creation so historical timesheets never shift when a user changes timezone.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, React 19, Server Components) | Single deployable; Route Handlers own the API surface |
| Language | **TypeScript** (strict, `noUncheckedIndexedAccess`) | Financial code without type safety is a liability |
| Database | **MongoDB + Mongoose 9** | Flexible schema for evolving project/task models |
| Auth | **Better Auth** with `better-auth-mongoose` | Real Mongoose models; session `user.id` is a stable string |
| Payments | **Razorpay** (subscriptions + one-time orders) | India-first billing with RBI e-mandate compliance |
| Validation | **Zod** | One schema for runtime validation and static types |
| Server state | **TanStack Query v5** | Cache invalidation, optimistic updates, hydration |
| HTTP | **Axios** (single instance, typed interceptors) | Predictable error normalisation |
| UI | **Base UI** primitives via **shadcn/ui** | Composable, accessible, themeable |
| Command palette | **cmdk** | The de facto standard; ships with shadcn |
| Toasts | **Sonner** | Minimal, accessible notifications |
| Lint | **ESLint 9 flat config** + `typescript-eslint` strict | Type-aware rules catch tenant leaks and unsafe casts |
| Format | **Prettier** + `prettier-plugin-tailwindcss` | Consistent formatting; sorted Tailwind classes |

---

## Architecture
.
├── .env
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── commonds
│   ├── content.txt
│   └── folder.txt
├── components.json
├── eslint.config.mjs
├── folder-structure.txt
├── next-env.d.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── src
│   ├── app
│   │   ├── (app)
│   │   │   └── projects
│   │   │       └── page.tsx
│   │   ├── api
│   │   │   ├── auth
│   │   │   │   └── [...all]
│   │   │   │       └── route.ts
│   │   │   ├── invoices
│   │   │   ├── projects
│   │   │   │   └── route.ts
│   │   │   ├── razorpay
│   │   │   │   └── webhook
│   │   │   │       └── route.ts
│   │   │   └── time-entries
│   │   │       └── route.ts
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── providers.tsx
│   ├── components
│   │   ├── command-palette.tsx
│   │   └── ui
│   │       ├── button.tsx
│   │       ├── command.tsx
│   │       ├── dialog.tsx
│   │       ├── input-group.tsx
│   │       ├── input.tsx
│   │       ├── kbd.tsx
│   │       ├── sonner.tsx
│   │       └── textarea.tsx
│   ├── hooks
│   │   ├── query-keys.ts
│   │   ├── use-projects.ts
│   │   └── use-time-entries.ts
│   ├── lib
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   ├── db
│   │   │   └── mongoose.ts
│   │   ├── query-client.ts
│   │   ├── razorpay
│   │   │   ├── client.ts
│   │   │   └── verify.ts
│   │   ├── schemas
│   │   │   ├── invoice.ts
│   │   │   ├── project.ts
│   │   │   └── time-entry.ts
│   │   ├── services
│   │   │   ├── accounting.service.ts
│   │   │   └── invoice.service.ts
│   │   ├── tenant
│   │   │   ├── tenant-context.ts
│   │   │   └── with-tenant.ts
│   │   └── utils.ts
│   ├── models
│   │   ├── account.model.ts
│   │   ├── invoice-counter.model.ts
│   │   ├── invoice.model.ts
│   │   ├── journal-entry.model.ts
│   │   ├── membership.model.ts
│   │   ├── project.model.ts
│   │   ├── tenant.model.ts
│   │   ├── time-entry.model.ts
│   │   └── webhook-event.model.ts
│   └── plugins
│       └── mongoose-tenant.ts
├── tsconfig.json
└── tsconfig.tsbuildinfo

