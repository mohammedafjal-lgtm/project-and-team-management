import { prisma } from "@/lib/db/prisma";
import { TenantContext } from "@/lib/tenancy/context";
import { centsToZohoAmount, zohoFetch } from "@/lib/zoho/client";

type ZohoInvoiceResponse = {
  invoice: {
    invoice_id: string;
    invoice_number: string;
    balance?: number;
    status?: string;
    currency_code?: string;
  };
};

type ZohoContactSearch = {
  contacts: { contact_id: string; contact_name: string; email?: string }[];
};

type ZohoContact = {
  contact: {
    contact_id: string;
    contact_name: string;
    currency_id?: string;
    currency_code?: string;
  };
};

type ZohoInvoicesList = {
  invoices: {
    invoice_id: string;
    invoice_number: string;
    status: string;
    total: number;
    date: string;
  }[];
};

type LocalInvoice = NonNullable<Awaited<ReturnType<typeof loadInvoiceForSync>>>;

function dateOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}

function invoiceTaxPercentage(invoice: { subtotalCents: number; taxCents: number }) {
  if (invoice.subtotalCents <= 0 || invoice.taxCents <= 0) return 0;
  return Math.round((invoice.taxCents / invoice.subtotalCents) * 10000) / 100;
}

function mapPaymentMode(method?: string | null) {
  switch (method) {
    case "STRIPE":
      return "creditcard";
    case "BANK_TRANSFER":
      return "banktransfer";
    default:
      return "others";
  }
}

async function loadInvoiceForSync(tenantId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      payments: { orderBy: { receivedAt: "asc" } },
    },
  });
}

async function resolveZohoCurrency(tenantId: string, currencyCode: string) {
  const code = currencyCode.toUpperCase();
  const data = await zohoFetch<{
    currencies: {
      currency_id: string;
      currency_code: string;
      exchange_rate?: number;
      is_base_currency?: boolean;
    }[];
  }>(tenantId, "/books/v3/settings/currencies");

  const match = data.currencies?.find((c) => c.currency_code?.toUpperCase() === code);
  if (!match) {
    throw new Error(
      `Currency ${code} is not enabled in Zoho Books. Enable it under Settings → Currencies, then sync again.`
    );
  }

  return {
    currencyId: match.currency_id,
    currencyCode: match.currency_code.toUpperCase(),
    exchangeRate: match.is_base_currency ? 1 : (match.exchange_rate ?? 1),
  };
}

async function createZohoCustomer(
  tenantId: string,
  input: {
    name: string;
    email?: string | null;
    billingAddress?: string | null;
    currencyId: string;
  }
) {
  const created = await zohoFetch<{ contact: { contact_id: string } }>(
    tenantId,
    "/books/v3/contacts",
    {
      method: "POST",
      body: JSON.stringify({
        contact_name: input.name,
        contact_type: "customer",
        currency_id: input.currencyId,
        email: input.email || undefined,
        billing_address: input.billingAddress ? { address: input.billingAddress } : undefined,
      }),
    }
  );
  return created.contact.contact_id;
}

/**
 * Zoho invoices inherit the customer's currency. If the linked contact is locked to
 * INR (common after existing transactions), create a separate USD contact instead.
 */
async function ensureZohoCustomerCurrency(
  ctx: TenantContext,
  client: {
    id: string;
    name: string;
    email: string | null;
    billingAddress: string | null;
  },
  customerId: string,
  currencyId: string,
  currencyCode: string
): Promise<string> {
  const data = await zohoFetch<ZohoContact>(ctx.tenantId, `/books/v3/contacts/${customerId}`);
  const contact = data.contact;
  const currentCode = contact.currency_code?.toUpperCase();
  if (contact.currency_id === currencyId || currentCode === currencyCode.toUpperCase()) {
    return customerId;
  }

  try {
    await zohoFetch(ctx.tenantId, `/books/v3/contacts/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({
        contact_name: contact.contact_name,
        currency_id: currencyId,
      }),
    });
    return customerId;
  } catch {
    // Zoho locks currency once the customer has invoices — spin up a currency-specific contact.
    const newCustomerId = await createZohoCustomer(ctx.tenantId, {
      name: `${client.name} (${currencyCode})`,
      email: client.email,
      billingAddress: client.billingAddress,
      currencyId,
    });
    await prisma.client.update({
      where: { id: client.id },
      data: { zohoCustomerId: newCustomerId },
    });
    return newCustomerId;
  }
}

async function resolveZohoCustomerId(
  ctx: TenantContext,
  clientId: string,
  currencyId: string
) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
  });
  if (!client) throw new Error("Client not found");
  if (client.zohoCustomerId) return { client, customerId: client.zohoCustomerId };

  if (client.email) {
    const search = await zohoFetch<ZohoContactSearch>(ctx.tenantId, "/books/v3/contacts", {
      query: { email: client.email },
    });
    const match = search.contacts?.[0];
    if (match) {
      await prisma.client.update({
        where: { id: client.id },
        data: { zohoCustomerId: match.contact_id },
      });
      return { client, customerId: match.contact_id };
    }
  }

  const customerId = await createZohoCustomer(ctx.tenantId, {
    name: client.name,
    email: client.email,
    billingAddress: client.billingAddress,
    currencyId,
  });

  await prisma.client.update({
    where: { id: client.id },
    data: { zohoCustomerId: customerId },
  });
  return { client, customerId };
}

function buildLineItems(
  lineItems: { description: string; quantity: number; unitPriceCents: number; amountCents: number }[]
) {
  return lineItems.map((l) => ({
    name: l.description.slice(0, 100) || "Line item",
    description: l.description,
    rate: centsToZohoAmount(l.unitPriceCents),
    quantity: l.quantity,
    item_total: centsToZohoAmount(l.amountCents),
  }));
}

/**
 * Push tax as a plain line item (not Zoho tax_id).
 * Indian GST orgs that aren't GST-registered reject tax invoices / tax masters.
 */
async function buildInvoicePayload(
  ctx: TenantContext,
  invoice: LocalInvoice,
  customerId: string,
  currency: { currencyId: string; exchangeRate: number }
) {
  const taxPercentage = invoiceTaxPercentage(invoice);

  const lineItems = buildLineItems(invoice.lineItems);
  if (invoice.taxCents > 0) {
    lineItems.push({
      name: taxPercentage > 0 ? `Tax (${taxPercentage}%)` : "Tax",
      description: `Tax synced from PTM invoice ${invoice.number}`,
      rate: centsToZohoAmount(invoice.taxCents),
      quantity: 1,
      item_total: centsToZohoAmount(invoice.taxCents),
    });
  }

  return {
    customer_id: customerId,
    currency_id: currency.currencyId,
    exchange_rate: currency.exchangeRate,
    date: dateOnly(invoice.issueDate),
    due_date: dateOnly(invoice.dueDate),
    reference_number: invoice.number,
    line_items: lineItems,
    notes: `Synced from PTM invoice ${invoice.number}`,
  };
}

async function markZohoInvoiceSent(tenantId: string, zohoInvoiceId: string) {
  try {
    await zohoFetch(tenantId, `/books/v3/invoices/${zohoInvoiceId}/status/sent`, {
      method: "POST",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    // Already sent / paid invoices reject this transition — safe to ignore.
    if (!message.includes("sent") && !message.includes("status") && !message.includes("paid")) {
      throw err;
    }
  }
}

async function syncZohoPayment(
  ctx: TenantContext,
  invoice: LocalInvoice,
  zohoInvoiceId: string,
  customerId: string
) {
  if (invoice.status !== "DRAFT") {
    await markZohoInvoiceSent(ctx.tenantId, zohoInvoiceId);
  }

  if (invoice.amountPaidCents <= 0) return;

  const remote = await zohoFetch<ZohoInvoiceResponse>(
    ctx.tenantId,
    `/books/v3/invoices/${zohoInvoiceId}`
  );
  const balance = Number(remote.invoice.balance ?? 0);
  if (balance <= 0) return;

  const amount = Math.min(centsToZohoAmount(invoice.amountPaidCents), balance);
  if (amount <= 0) return;

  const latestPayment = invoice.payments[invoice.payments.length - 1];
  await zohoFetch(ctx.tenantId, "/books/v3/customerpayments", {
    method: "POST",
    body: JSON.stringify({
      customer_id: customerId,
      payment_mode: mapPaymentMode(latestPayment?.method),
      amount,
      date: dateOnly(invoice.paidAt ?? latestPayment?.receivedAt ?? new Date()),
      reference_number: latestPayment?.reference ?? invoice.number,
      description: `Payment synced from PTM invoice ${invoice.number}`,
      invoices: [{ invoice_id: zohoInvoiceId, amount_applied: amount }],
    }),
  });
}

export async function listZohoInvoicesForClient(ctx: TenantContext, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: ctx.tenantId },
    select: { currency: true },
  });
  if (!client) throw new Error("Client not found");

  const currency = await resolveZohoCurrency(ctx.tenantId, client.currency);
  const { customerId } = await resolveZohoCustomerId(ctx, clientId, currency.currencyId);
  const data = await zohoFetch<ZohoInvoicesList>(ctx.tenantId, "/books/v3/invoices", {
    query: {
      customer_id: customerId,
      sort_column: "created_time",
      sort_order: "D",
      per_page: "25",
    },
  });
  return data.invoices ?? [];
}

export async function createZohoInvoiceFromLocal(ctx: TenantContext, invoiceId: string) {
  const invoice = await loadInvoiceForSync(ctx.tenantId, invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "VOID") throw new Error("Cannot sync a voided invoice");

  const currency = await resolveZohoCurrency(ctx.tenantId, invoice.currency);
  const resolved = await resolveZohoCustomerId(ctx, invoice.clientId, currency.currencyId);
  const customerId = await ensureZohoCustomerCurrency(
    ctx,
    resolved.client,
    resolved.customerId,
    currency.currencyId,
    currency.currencyCode
  );

  const payload = await buildInvoicePayload(ctx, invoice, customerId, currency);

  const created = await zohoFetch<ZohoInvoiceResponse>(ctx.tenantId, "/books/v3/invoices", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  await syncZohoPayment(ctx, invoice, created.invoice.invoice_id, customerId);

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      zohoInvoiceId: created.invoice.invoice_id,
      zohoInvoiceNumber: created.invoice.invoice_number,
    },
  });
}

export async function updateZohoInvoiceFromLocal(
  ctx: TenantContext,
  invoiceId: string,
  zohoInvoiceId: string
) {
  const invoice = await loadInvoiceForSync(ctx.tenantId, invoiceId);
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "VOID") throw new Error("Cannot sync a voided invoice");

  const currency = await resolveZohoCurrency(ctx.tenantId, invoice.currency);
  const resolved = await resolveZohoCustomerId(ctx, invoice.clientId, currency.currencyId);
  const customerId = await ensureZohoCustomerCurrency(
    ctx,
    resolved.client,
    resolved.customerId,
    currency.currencyId,
    currency.currencyCode
  );

  // Existing Zoho invoices keep their original currency; currency changes need a new invoice.
  const existing = await zohoFetch<ZohoInvoiceResponse>(
    ctx.tenantId,
    `/books/v3/invoices/${zohoInvoiceId}`
  );
  const existingCode = existing.invoice.currency_code?.toUpperCase();
  if (existingCode && existingCode !== currency.currencyCode) {
    throw new Error(
      `Zoho invoice ${existing.invoice.invoice_number ?? zohoInvoiceId} is in ${existingCode}, but this invoice is ${currency.currencyCode}. ` +
        `Use Create to make a new Zoho invoice (Update cannot change currency on an existing invoice).`
    );
  }

  const payload = await buildInvoicePayload(ctx, invoice, customerId, currency);

  const updatedRemote = await zohoFetch<ZohoInvoiceResponse>(
    ctx.tenantId,
    `/books/v3/invoices/${zohoInvoiceId}`,
    {
      method: "PUT",
      body: JSON.stringify({
        ...payload,
        notes: `Updated from PTM invoice ${invoice.number}`,
        // Required by Zoho when the invoice is already marked sent.
        reason: `Synced from PTM invoice ${invoice.number}`,
      }),
    }
  );

  await syncZohoPayment(ctx, invoice, updatedRemote.invoice.invoice_id, customerId);

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      zohoInvoiceId: updatedRemote.invoice.invoice_id,
      zohoInvoiceNumber: updatedRemote.invoice.invoice_number,
    },
  });
}
