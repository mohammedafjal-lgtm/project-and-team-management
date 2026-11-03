import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(['active', 'archived']).default('active'),
});

export const updateProjectSchema = createProjectSchema.partial();