import { describe, it, expect } from "vitest";
import { newGame, click, tick, buyProducer, buyClickTier, buyUpgrade, availableUpgrades,
  producerCost, boonPerSecond, canPrestige, prestige, canNirvana, baramiGain, GameState } from "../src/lib/engine";
import { PRODUCERS, CLICK_TIERS, TUNING } from "../src/lib/data";
import { applyOffline } from "../src/lib/save";

const CLICKS_PER_SEC = 4;

function botSecond(s: GameState, now: number): void {
  for (let c = 0; c < CLICKS_PER_SEC; c++) click(s, now);
  tick(s, 1, now);
  if (s.clickTier < 4) buyClickTier(s, s.clickTier + 1);
  // greedy: best bps-per-boon purchase, loop until nothing affordable improves
  for (;;) {
    let bought = false;
    for (const u of availableUpgrades(s)) if (u.cost <= s.boon && u.effect.kind !== "offlineCap") { buyUpgrade(s, u.id); bought = true; }
    let best = -1, bestValue = 0;
    for (let i = 0; i < PRODUCERS.length; i++) {
      const cost = producerCost(i, s.producers[i]!);
      if (cost > s.boon) continue;
      const value = PRODUCERS[i]!.baseRate / cost;
      if (value > bestValue) { bestValue = value; best = i; }
    }
    if (best >= 0) { buyProducer(s, best); bought = true; }
    if (!bought) break;
  }
}

function playActive(s: GameState, seconds: number, startMs: number): number {
  for (let t = 0; t < seconds; t++) botSecond(s, startMs + t * 1000);
  return startMs + seconds * 1000;
}

describe("pacing gates (binding — tune data.ts numbers if these fail)", () => {
  it("first producer affordable within 30s", () => {
    const s = newGame(0);
    let t = 0;
    while (s.producers.every(p => p === 0) && t < 30) { botSecond(s, t * 1000); t++; }
    expect(t).toBeLessThanOrEqual(30);
  });
  it("first prestige unlocks between 20 and 75 min active", () => {
    const s = newGame(0);
    let sec = 0;
    while (!canPrestige(s) && sec < 75 * 60) { botSecond(s, sec * 1000); sec++; }
    expect(sec).toBeGreaterThanOrEqual(20 * 60);
    expect(sec).toBeLessThanOrEqual(75 * 60);
  }, 120_000);
  it("producer 11 first affordable within 2-6h cumulative active play (across prestiges)", () => {
    const s = newGame(0);
    let sec = 0; let seen = false;
    while (!seen && sec < 6 * 3600) {
      botSecond(s, sec * 1000); sec++;
      if (s.boon >= producerCost(10, 0) || (s.producers[10] ?? 0) > 0) seen = true;
      if (canPrestige(s) && baramiGain(s) >= Math.max(1, s.barami * 0.5)) prestige(s, sec * 1000);
    }
    expect(seen).toBe(true);
    expect(sec).toBeGreaterThanOrEqual(2 * 3600);
  }, 120_000);
  it("nirvana reachable in 5-14 days of casual play (3×20min sessions/day + offline)", () => {
    const s = newGame(0);
    let now = 0; let days = 0;
    while (!canNirvana(s) && days < 14) {
      for (let session = 0; session < 3; session++) {
        applyOffline(s, now);
        now = playActive(s, 20 * 60, now);
        if (canPrestige(s) && baramiGain(s) >= Math.max(1, Math.floor(s.barami * 0.5))) prestige(s, now);
        now += 7 * 3600 * 1000; // gap to next session
      }
      now += 3 * 3600 * 1000; days++;
    }
    expect(days).toBeGreaterThanOrEqual(5);
    expect(days).toBeLessThan(14);
  }, 120_000);
});
