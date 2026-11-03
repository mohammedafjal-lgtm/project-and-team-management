export const queryKeys = {
    projects: (tenantId: string) => ['projects', tenantId] as const,
    project: (tenantId: string, id: string) => ['projects', tenantId, id] as const,
    timeEntries: (tenantId: string) => ['time-entries', tenantId] as const,
    invoices: (tenantId: string) => ['invoices', tenantId] as const,
  };