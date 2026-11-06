/**
 * All money is in integer cents. All rates are in basis points (10000 = 100%).
 * This module is pure: no DB, no framework. It is the single source of truth
 * for tax allocation across a set of line items.
 */

export type LineInput = {
    amountCents: number; // pre-tax amount
  };
  
  export type TaxAllocation = {
    perLine: number[]; // tax applied to each line, in cents
    totalTaxCents: number;
    netCents: number;
    grossCents: number;
  };
  
  /**
   * Distributes tax across lines using the largest-remainder method so that
   * the sum of per-line tax exactly equals the rounded total tax.
   *
   * @throws if amounts or rate are negative, or if line count is 0.
   */
  export function allocateTax(lines: LineInput[], taxRateBps: number): TaxAllocation {
    if (taxRateBps < 0) throw new Error("taxRateBps must be >= 0");
    if (lines.length === 0) throw new Error("At least one line is required");
  
    const netCents = lines.reduce((s, l) => s + l.amountCents, 0);
    if (netCents < 0) throw new Error("Line amounts must be >= 0");
  
    const exactTax = (netCents * taxRateBps) / 10000;
    const totalTaxCents = Math.round(exactTax);
  
    // Largest-remainder allocation.
    const raw = lines.map((l) => (l.amountCents * taxRateBps) / 10000);
    const floors = raw.map((r) => Math.floor(r));
    const remainders = raw.map((r, i) => ({ i, rem: r - floors[i] }));
    let leftover = totalTaxCents - floors.reduce((s, n) => s + n, 0);
  
    remainders.sort((a, b) => b.rem - a.rem);
    const perLine = [...floors];
    for (let k = 0; k < remainders.length && leftover > 0; k++) {
      perLine[remainders[k].i] += 1;
      leftover -= 1;
    }
  
    return {
      perLine,
      totalTaxCents,
      netCents,
      grossCents: netCents + totalTaxCents,
    };
  }