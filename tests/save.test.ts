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
      .replace('"producers":[0,0,0,0,0,0,0,0,0,0,0]', '"producers":[1,2]');
    const back = deserialize(raw, 0);
    expect(back.upgrades).toEqual(["a-ring"]);
    expect(back.producers).toHaveLength(11);
    expect(back.producers[0]).toBe(1);
  });
});

describe("offline progress", () => {
  it("caps at 8h and never goes negative (clock rollback)", () => {
    const s = newGame(0);
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
});
