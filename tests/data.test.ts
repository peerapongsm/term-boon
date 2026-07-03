import { describe, it, expect } from "vitest";
import { PRODUCERS, CLICK_TIERS, UPGRADES, REBIRTH_TIERS, EVENTS, ACHIEVEMENTS, TUNING } from "../src/lib/data";

describe("data integrity", () => {
  it("has 11 producers with ascending costs and rates", () => {
    expect(PRODUCERS).toHaveLength(11);
    for (let i = 1; i < 11; i++) {
      expect(PRODUCERS[i]!.baseCost).toBeGreaterThan(PRODUCERS[i - 1]!.baseCost);
      expect(PRODUCERS[i]!.baseRate).toBeGreaterThan(PRODUCERS[i - 1]!.baseRate);
    }
  });
  it("has 5 click tiers ascending, tier 0 free", () => {
    expect(CLICK_TIERS).toHaveLength(5);
    expect(CLICK_TIERS[0]!.cost).toBe(0);
    for (let i = 1; i < 5; i++) expect(CLICK_TIERS[i]!.cost).toBeGreaterThan(CLICK_TIERS[i - 1]!.cost);
  });
  it("has 33 producer-milestone upgrades (3 per producer at 10/25/50) + 6 amulets", () => {
    const milestones = UPGRADES.filter(u => u.requires);
    expect(milestones).toHaveLength(33);
    for (let p = 0; p < 11; p++) {
      const counts = milestones.filter(u => u.requires!.producer === p).map(u => u.requires!.count).sort((a, b) => a - b);
      expect(counts).toEqual([10, 25, 50]);
    }
    expect(UPGRADES.filter(u => !u.requires)).toHaveLength(6);
    expect(new Set(UPGRADES.map(u => u.id)).size).toBe(UPGRADES.length);
  });
  it("has 5 rebirth tiers ascending from 0", () => {
    expect(REBIRTH_TIERS.map(t => t.baramiFloor)).toEqual([0, 1, 25, 250, 2500]);
  });
  it("has 2 events and 10 achievements incl. 1 hidden", () => {
    expect(EVENTS).toHaveLength(2);
    expect(ACHIEVEMENTS).toHaveLength(10);
    expect(ACHIEVEMENTS.filter(a => a.hidden)).toHaveLength(1);
  });
  it("guardrail: no forbidden symbols in any copy", () => {
    const all = JSON.stringify({ PRODUCERS, CLICK_TIERS, UPGRADES, EVENTS, ACHIEVEMENTS });
    expect(all).not.toMatch(/ครุฑ|กินรี/);
  });
});
