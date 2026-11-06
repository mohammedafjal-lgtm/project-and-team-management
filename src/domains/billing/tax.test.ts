import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { allocateTax } from "./tax";

describe("allocateTax", () => {
  it("is zero for zero tax rate", () => {
    const a = allocateTax([{ amountCents: 12345 }, { amountCents: 6789 }], 0);
    expect(a.totalTaxCents).toBe(0);
    expect(a.perLine).toEqual([0, 0]);
  });

  it("distributes tax exactly for a single line", () => {
    const a = allocateTax([{ amountCents: 10_000 }], 825); // 8.25%
    expect(a.totalTaxCents).toBe(825);
    expect(a.perLine).toEqual([825]);
  });

  it("sums per-line tax to the total tax (property test)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 100_000 }), { minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 2500 }),
        (amounts, rate) => {
          const a = allocateTax(amounts.map((x) => ({ amountCents: x })), rate);
          const sumLines = a.perLine.reduce((s, n) => s + n, 0);
          expect(sumLines).toBe(a.totalTaxCents);
        }
      )
    );
  });

  it("gross = net + totalTax (property test)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50_000 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 2000 }),
        (amounts, rate) => {
          const a = allocateTax(amounts.map((x) => ({ amountCents: x })), rate);
          expect(a.grossCents).toBe(a.netCents + a.totalTaxCents);
        }
      )
    );
  });

  it("per-line tax is within 1 cent of exact share (property test)", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10_000 }), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 2000 }),
        (amounts, rate) => {
          const a = allocateTax(amounts.map((x) => ({ amountCents: x })), rate);
          for (let i = 0; i < amounts.length; i++) {
            const exact = (amounts[i] * rate) / 10000;
            expect(Math.abs(a.perLine[i] - exact)).toBeLessThanOrEqual(1);
          }
        }
      )
    );
  });

  it("rejects negative rate and empty line list", () => {
    expect(() => allocateTax([{ amountCents: 100 }], -1)).toThrow();
    expect(() => allocateTax([], 100)).toThrow();
  });
});