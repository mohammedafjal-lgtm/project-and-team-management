import { z } from 'zod';

export const createTimeEntrySchema = z
  .object({
    projectId: z.string().min(1),
    description: z.string().max(500).default(''),
    startedAt: z.coerce.date(),
    endedAt: z.coerce.date().optional(),
    billable: z.boolean().default(true),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    workTimezone: z.string().min(1),
  })
  .refine((v) => !v.endedAt || v.endedAt > v.startedAt, {
    message: 'End must be after start',
    path: ['endedAt'],
  });
