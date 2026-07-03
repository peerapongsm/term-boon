import { describe, it, expect } from "vitest";
import { GRIDS, PALETTE } from "../src/sprites";

describe("pixel sprites", () => {
  it("covers all 5 click tiers and 11 producers", () => {
    for (let i = 0; i < 5; i++) expect(GRIDS[`tier-${i}`]).toBeDefined();
    for (let i = 0; i < 11; i++) expect(GRIDS[`p${i}`]).toBeDefined();
    expect(Object.keys(GRIDS)).toHaveLength(16);
  });
  it("every grid is 16×16 with palette-only chars", () => {
    for (const [id, rows] of Object.entries(GRIDS)) {
      expect(rows, id).toHaveLength(16);
      for (const row of rows) {
        expect(row, `${id}: ${row}`).toHaveLength(16);
        for (const ch of row) expect(ch === "." || ch in PALETTE, `${id}: bad char "${ch}"`).toBe(true);
      }
    }
  });
});
