'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { queryKeys } from './query-keys';

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitAmountCents: number;
  amountCents: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: number;
  clientName: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  currency: string;
  lines: InvoiceLine[];
  totalCents: number;
  createdAt: string;
}

export interface CreateInvoicePayload {
  clientName: string;
  lines: {
    description: string;
    quantity: number;
    unitAmountCents: number;
  }[];
}

export function useInvoices(tenantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoices(tenantId ?? ''),
    queryFn: async () => {
      const { data } = await api.get<Invoice[]>('/invoices');
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateInvoice(tenantId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateInvoicePayload) => {
      const { data } = await api.post<Invoice>('/invoices', input);
      return data;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.invoices(tenantId) });
    },
    onSuccess: () => toast.success('Invoice created'),
    onError: (err: Error) => toast.error(err.message),
  });
}
