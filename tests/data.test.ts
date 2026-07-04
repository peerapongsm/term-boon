import { describe, it, expect } from "vitest";
import { PRODUCERS, CLICK_TIERS, UPGRADES, REBIRTH_TIERS, EVENTS, ACHIEVEMENTS, TUNING, AD_COPY, NEWS_ECHO } from "../src/lib/data";

describe("data integrity", () => {
  it("has 14 producers with ascending costs and rates", () => {
    expect(PRODUCERS).toHaveLength(14);
    for (let i = 1; i < 14; i++) {
      expect(PRODUCERS[i]!.baseCost).toBeGreaterThan(PRODUCERS[i - 1]!.baseCost);
      expect(PRODUCERS[i]!.baseRate).toBeGreaterThan(PRODUCERS[i - 1]!.baseRate);
    }
  });
  it("has 5 click tiers ascending, tier 0 free", () => {
    expect(CLICK_TIERS).toHaveLength(5);
    expect(CLICK_TIERS[0]!.cost).toBe(0);
    for (let i = 1; i < 5; i++) expect(CLICK_TIERS[i]!.cost).toBeGreaterThan(CLICK_TIERS[i - 1]!.cost);
  });
  it("has 42 producer-milestone upgrades (3 per producer at 10/25/50) + 8 amulets", () => {
    const milestones = UPGRADES.filter(u => u.requires);
    expect(milestones).toHaveLength(42);
    for (let p = 0; p < 14; p++) {
      const counts = milestones.filter(u => u.requires!.producer === p).map(u => u.requires!.count).sort((a, b) => a - b);
      expect(counts).toEqual([10, 25, 50]);
    }
    expect(UPGRADES.filter(u => !u.requires)).toHaveLength(8);
    expect(new Set(UPGRADES.map(u => u.id)).size).toBe(UPGRADES.length);
  });
  it("has 7 rebirth tiers ascending from 0", () => {
    expect(REBIRTH_TIERS.map(t => t.baramiFloor)).toEqual([0, 1, 20, 80, 200, 1200, 6000]);
  });
  it("has 7 events and 12 achievements incl. 2 hidden", () => {
    expect(EVENTS).toHaveLength(7);
    expect(ACHIEVEMENTS).toHaveLength(12);
    expect(ACHIEVEMENTS.filter(a => a.hidden)).toHaveLength(2);
  });
  it("has arahant + samsara achievements", () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(ids).toContain("arahant");
    expect(ids).toContain("samsara-10");
  });
  it("guardrail: no forbidden symbols in any copy", () => {
    const all = JSON.stringify({ PRODUCERS, CLICK_TIERS, UPGRADES, EVENTS, ACHIEVEMENTS });
    expect(all).not.toMatch(/ครุฑ|กินรี/);
  });

  it("producer curve is exponential with no value cliff", () => {
    expect(PRODUCERS).toHaveLength(14);
    for (let i = 1; i < PRODUCERS.length; i++) {
      const costRatio = PRODUCERS[i]!.baseCost / PRODUCERS[i - 1]!.baseCost;
      const rateRatio = PRODUCERS[i]!.baseRate / PRODUCERS[i - 1]!.baseRate;
      expect(costRatio).toBeGreaterThanOrEqual(3.5);   // ~×4, never the old ×1.4 cliff
      expect(rateRatio).toBeGreaterThanOrEqual(4.5);   // ~×5
    }
  });

  it("producers are classed and creditRate signs match class", () => {
    PRODUCERS.forEach((p, i) => {
      expect(["wholesome", "neutral", "monetize"]).toContain(p.klass);
      if (p.klass === "wholesome") expect(p.creditRate).toBeGreaterThan(0);
      if (p.klass === "monetize") expect(p.creditRate).toBeLessThan(0);
      if (i < 4) expect(p.klass).toBe("wholesome");
      if (i >= 8) expect(p.klass).toBe("monetize");
    });
  });

  it("rebirth ladder has 7 monotonic tiers ending อรหันต์", () => {
    expect(REBIRTH_TIERS.map(t => t.name)).toEqual([
      "หมาวัด", "มนุษย์เดินดิน", "เศรษฐีใจบุญ", "เทพบุตร-เทพธิดา", "เทวดา", "พรหม", "อรหันต์",
    ]);
    expect(REBIRTH_TIERS.map(t => t.baramiFloor)).toEqual([0, 1, 20, 80, 200, 1200, 6000]);
  });

  it("TUNING has the new update constants", () => {
    expect(TUNING.creditMin).toBe(300);
    expect(TUNING.creditMax).toBe(900);
    expect(TUNING.creditGateFloor).toBe(500);
    expect(TUNING.loanSiphon).toBeCloseTo(0.25);
    expect(TUNING.adCooldownSec).toBe(300);
    expect(TUNING.nirvanaBarami).toBe(10_000);
  });

  it("ad copy exists and stays generic (no real brands)", () => {
    expect(AD_COPY.length).toBeGreaterThanOrEqual(3);
    AD_COPY.forEach(line => expect(line.length).toBeGreaterThan(4));
  });

  it("news-echo headlines exist", () => {
    expect(NEWS_ECHO.length).toBeGreaterThanOrEqual(4);
  });
});
