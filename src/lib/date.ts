/**
 * Deterministic date formatter for SSR + client.
 *
 * `Date` fields stored as `@db.Date` come back from Prisma as a JS Date at
 * UTC midnight. Formatting them with `toLocaleDateString()` uses the runtime's
 * locale AND timezone, which differ between the Node server and the browser —
 * causing React hydration mismatches. Pin both to UTC + en-US.
 */
export function formatDate(input: Date | string | null | undefined): string {
    if (input == null) return "—";
    const d = typeof input === "string" ? new Date(input) : input;
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }