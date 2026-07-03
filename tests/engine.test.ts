import { describe, it, expect } from "vitest";
import { newGame, click, tick, buyProducer, buyClickTier, producerCost, boonPerSecond, boonPerClick, buyUpgrade, availableUpgrades } from "../src/lib/engine";
import { PRODUCERS, TUNING, UPGRADES } from "../src/lib/data";

describe("core engine", () => {
  it("new game starts at zero, click gives 1 boon", () => {
    const s = newGame(0);
    expect(s.boon).toBe(0);
    expect(click(s, 0)).toBe(1);
    expect(s.boon).toBe(1);
    expect(s.stats.clicks).toBe(1);
  });
  it("producer cost grows 1.15^owned", () => {
    expect(producerCost(0, 0)).toBe(15);
    expect(producerCost(0, 1)).toBeCloseTo(15 * 1.15);
  });
  it("buyProducer spends boon and increases bps; refuses when broke", () => {
    const s = newGame(0);
    expect(buyProducer(s, 0)).toBe(false);
    s.boon = 15;
    expect(buyProducer(s, 0)).toBe(true);
    expect(s.boon).toBe(0);
    expect(boonPerSecond(s, 0)).toBeCloseTo(PRODUCERS[0]!.baseRate);
  });
  it("tick accrues bps × dt into boon/totalBoon/allTimeBoon", () => {
    const s = newGame(0);
    s.producers[0] = 10;
    tick(s, 5, 0);
    expect(s.boon).toBeCloseTo(10 * PRODUCERS[0]!.baseRate * 5);
    expect(s.totalBoon).toBeCloseTo(s.boon);
    expect(s.allTimeBoon).toBeCloseTo(s.boon);
  });
  it("click tier upgrade raises boonPerClick, must buy in order", () => {
    const s = newGame(0);
    s.boon = 500;
    expect(buyClickTier(s, 2)).toBe(false); // can't skip
    expect(buyClickTier(s, 1)).toBe(true);
    expect(boonPerClick(s, 0)).toBe(10);
  });
  it("refuses to buy past the max tier", () => {
    const s = newGame(0);
    s.clickTier = 4;
    s.boon = 1e15;
    expect(buyClickTier(s, 5)).toBe(false);
    expect(s.clickTier).toBe(4);
  });
});

describe("upgrades", () => {
  it("milestone upgrade locked until producer count met", () => {
    const s = newGame(0);
    s.boon = 1e15;
    expect(buyUpgrade(s, "m0-10")).toBe(false);
    s.producers[0] = 10;
    expect(buyUpgrade(s, "m0-10")).toBe(true);
    expect(buyUpgrade(s, "m0-10")).toBe(false); // no double-buy
  });
  it("producer ×2 upgrade doubles that producer's output only", () => {
    const s = newGame(0);
    s.producers[0] = 10; s.producers[1] = 1; s.boon = 1e15;
    const before0 = boonPerSecond(s, 0);
    buyUpgrade(s, "m0-10");
    const u = UPGRADES.find(x => x.id === "m0-10")!;
    // producer 0 contribution doubled, producer 1 unchanged
    expect(boonPerSecond(s, 0)).toBeCloseTo(before0 + 10 * 0.1); // +100% of producer0's 10×0.1
  });
  it("amulet click ×2 doubles boonPerClick", () => {
    const s = newGame(0); s.boon = 1e15;
    const before = boonPerClick(s, 0);
    buyUpgrade(s, "a-ring");
    expect(boonPerClick(s, 0)).toBeCloseTo(before * 2);
  });
  it("availableUpgrades hides owned and unmet milestones", () => {
    const s = newGame(0);
    expect(availableUpgrades(s).every(u => !u.requires)).toBe(true);
    s.producers[2] = 25;
    expect(availableUpgrades(s).some(u => u.id === "m2-10")).toBe(true);
    expect(availableUpgrades(s).some(u => u.id === "m2-25")).toBe(true);
    expect(availableUpgrades(s).some(u => u.id === "m2-50")).toBe(false);
  });
});
