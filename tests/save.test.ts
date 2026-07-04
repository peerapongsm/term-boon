import { describe, it, expect } from "vitest";
import { serialize, deserialize, applyOffline, offlineHours } from "../src/lib/save";
import { newGame, buyUpgrade } from "../src/lib/engine";

describe("save round-trip", () => {
  it("round-trips a mid-game state", () => {
    const s = newGame(1000);
    s.boon = 123; s.producers[3] = 7; s.barami = 4;
    const back = deserialize(serialize(s), 1000);
    expect(back).toEqual(s);
  });
  it("garbage input yields a fresh game", () => {
    expect(deserialize(null, 0).boon).toBe(0);
    expect(deserialize("not json", 0).boon).toBe(0);
    expect(deserialize('{"v":99}', 0).boon).toBe(0);
  });
  it("hostile numbers are clamped (Infinity-poisoning lesson)", () => {
    const s = newGame(0); s.boon = 5;
    const raw = serialize(s).replace('"boon":5', '"boon":1e999');
    const back = deserialize(raw, 0);
    expect(Number.isFinite(back.boon)).toBe(true);
    expect(back.boon).toBeLessThanOrEqual(1e300);
    const neg = serialize(s).replace('"boon":5', '"boon":-10');
    expect(deserialize(neg, 0).boon).toBe(0);
  });
  it("unknown upgrade ids dropped, producer array right-sized", () => {
    const s = newGame(0); s.upgrades.push("a-ring");
    const raw = serialize(s)
      .replace('"a-ring"', '"a-ring","fake-id"')
      .replace('"producers":[0,0,0,0,0,0,0,0,0,0,0,0,0,0]', '"producers":[1,2]');
    const back = deserialize(raw, 0);
    expect(back.upgrades).toEqual(["a-ring"]);
    expect(back.producers).toHaveLength(14);
    expect(back.producers[0]).toBe(1);
  });
  it("dedupes repeated valid ids (multiplier-stacking exploit)", () => {
    const s = newGame(0); s.upgrades.push("a-ring");
    const raw = serialize(s).replace('"a-ring"', '"a-ring","a-ring","a-ring"');
    const back = deserialize(raw, 0);
    expect(back.upgrades).toEqual(["a-ring"]);
  });
  it("migrates a v1 save (no credit) to defaults", () => {
    const v1 = JSON.stringify({ v: 1, state: { boon: 5, barami: 3, lives: 2 } });
    const s = deserialize(v1, 1000);
    expect(s.credit).toBe(650);
    expect(s.loan).toBeNull();
    expect(s.lastAdMs).toBe(0);
    expect(s.samsara).toBe(0);
    expect(s.barami).toBe(3);
  });
  it("clamps hostile credit and rejects poisoned loan", () => {
    const bad = JSON.stringify({ v: 2, state: {
      credit: 1e999, loan: { principal: -5, remaining: 1e999, interestRate: 0.15 },
      lastAdMs: 1e999, samsara: -3,
    } });
    const s = deserialize(bad, 1000);
    expect(s.credit).toBe(900);          // clamped to max
    expect(s.loan).toBeNull();           // non-finite/negative → dropped
    expect(Number.isFinite(s.lastAdMs)).toBe(true);
    expect(s.samsara).toBe(0);
  });
});

describe("offline progress", () => {
  it("caps at 8h and never goes negative (clock rollback)", () => {
    const s = newGame(0);
    s.credit = 750;
    s.producers[0] = 10; s.lastSeen = 0; // 1 bps
    expect(applyOffline(s, 24 * 3600 * 1000)).toBeCloseTo(8 * 3600); // capped
    const s2 = newGame(1_000_000); s2.producers[0] = 10;
    expect(applyOffline(s2, 0)).toBe(0); // clock moved backwards
  });
  it("amulet extends cap to 12h", () => {
    const s = newGame(0); s.boon = 1e15; buyUpgrade(s, "a-soi");
    expect(offlineHours(s)).toBe(12);
  });
  it("short absence gives nothing (refresh is not a vacation)", () => {
    const s = newGame(0); s.producers[0] = 10; s.lastSeen = 0;
    expect(applyOffline(s, 30_000)).toBe(0);
  });
  it("offline income is reduced by audit tax", () => {
    const s = newGame(0); s.producers[0] = 100; s.credit = 400; s.lastSeen = 0;
    const gained = applyOffline(s, 3600 * 1000);   // 1h
    const gross = 100 * 0.1 * 3600;                // capped well under 8h
    expect(gained).toBeCloseTo(gross * 0.75, 0);
  });
});
