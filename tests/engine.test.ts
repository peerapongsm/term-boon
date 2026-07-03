import { describe, it, expect } from "vitest";
import { newGame, click, tick, buyProducer, buyClickTier, producerCost, boonPerSecond, boonPerClick } from "../src/lib/engine";
import { PRODUCERS, TUNING } from "../src/lib/data";

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
});
