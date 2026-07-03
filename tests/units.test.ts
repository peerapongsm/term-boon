import { describe, it, expect } from "vitest";
import { formatBoon, unitFor, UNITS, fullBreakdown } from "../src/lib/units";

describe("units ladder", () => {
  it("is strictly ascending", () => {
    for (let i = 1; i < UNITS.length; i++)
      expect(UNITS[i]!.pow).toBeGreaterThan(UNITS[i - 1]!.pow);
  });
  it("starts at โกฏิ = 1e7", () => {
    expect(UNITS[0]).toEqual({ pow: 7, name: "โกฏิ" });
  });
});

describe("formatBoon", () => {
  it("comma-groups below 1e7", () => {
    expect(formatBoon(0)).toBe("0");
    expect(formatBoon(12345)).toBe("12,345");
    expect(formatBoon(9999999)).toBe("9,999,999");
  });
  it("uses units with 3 significant digits from โกฏิ up", () => {
    expect(formatBoon(4.2e7)).toBe("4.20 โกฏิ");
    expect(formatBoon(1.234e14)).toBe("1.23 ปโกฏิ");
  });
  it("clamps between rungs to the lower rung", () => {
    expect(formatBoon(5e12)).toBe("500,000 โกฏิ"); // 1e7 unit, 5e12/1e7=5e5 — still โกฏิ, comma-grouped multiplier
  });
  it("uses true 3 significant digits across the multiplier range", () => {
    expect(formatBoon(4.56e8)).toBe("45.6 โกฏิ");
    expect(formatBoon(4.567e9)).toBe("457 โกฏิ");
  });
  it("formats the exact 1e7 boundary", () => {
    expect(formatBoon(1e7)).toBe("1.00 โกฏิ");
  });
  it("unitFor returns null below โกฏิ", () => {
    expect(unitFor(999)).toBeNull();
    expect(unitFor(2e7)).toBe("โกฏิ");
  });
});

describe("fullBreakdown", () => {
  it("fullBreakdown includes full figure and unit power", () => {
    expect(fullBreakdown(12345)).toBe("12,345 บุญ");
    expect(fullBreakdown(2e7)).toContain("โกฏิ");
    expect(fullBreakdown(2e7)).toContain("10^7");
  });
  it("handles hostile inputs", () => {
    expect(formatBoon(-5)).toBe("0");
    expect(formatBoon(NaN)).toBe("0");
  });
});
