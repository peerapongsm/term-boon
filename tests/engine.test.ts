import { describe, it, expect } from "vitest";
import { newGame, click, tick, buyProducer, buyClickTier, producerCost, boonPerSecond, boonPerClick, buyUpgrade, availableUpgrades, triggerEvent, nextEventDelayMs, canPrestige, baramiGain, prestige, rebirthTier, rebirthTierIndex, canNirvana, nirvana, reenter, creditDriftFromUpgrades, hasAuditImmune, creditBonus, creditTarget, creditTick, auditTaxRate, comboMult, takeLoan } from "../src/lib/engine";
import { PRODUCERS, TUNING, UPGRADES } from "../src/lib/data";

describe("core engine", () => {
  it("new game starts at zero, click gives 1 boon", () => {
    const s = newGame(0);
    s.credit = 750;
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
    s.credit = 750;
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
  it("newGame initializes credit and new fields", () => {
    const s = newGame(0);
    expect(s.credit).toBe(650);
    expect(s.loan).toBeNull();
    expect(s.clickCombo).toEqual({ count: 0, lastClickMs: 0 });
    expect(s.lastAdMs).toBe(0);
    expect(s.samsara).toBe(0);
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
  it("credit amulets contribute drift and immunity", () => {
    const s = newGame(0);
    s.upgrades = ["a-credit", "a-cert"];
    expect(creditDriftFromUpgrades(s)).toBe(100);
    expect(hasAuditImmune(s)).toBe(true);
  });
});

describe("events", () => {
  it("kathin multiplies click ×777 during buff and expires after 7s", () => {
    const s = newGame(0);
    const base = boonPerClick(s, 0);
    triggerEvent(s, "kathin", 0);
    expect(boonPerClick(s, 1000)).toBeCloseTo(base * 777);
    expect(boonPerClick(s, 7001)).toBeCloseTo(base);
  });
  it("dara doubles income but taxes 7%, tax tracked in stats", () => {
    const s = newGame(0);
    s.producers[0] = 10; // 1 bps
    triggerEvent(s, "dara", 0);
    tick(s, 1, 1000);
    expect(s.boon).toBeCloseTo(2 * (1 - 0.07)); // ×2 then −7%
    expect(s.stats.mediaTaxPaid).toBeCloseTo(2 * 0.07);
  });
  it("ตะกรุด extends buff duration ×1.5", () => {
    const s = newGame(0); s.boon = 1e15; buyUpgrade(s, "a-takrut");
    triggerEvent(s, "kathin", 0);
    expect(boonPerClick(s, 10_000)).toBeGreaterThan(1); // 7s×1.5=10.5s still active
  });
  it("nextEventDelayMs stays in tuned window", () => {
    for (const r of [0, 0.5, 0.999]) {
      const ms = nextEventDelayMs(() => r);
      expect(ms).toBeGreaterThanOrEqual(60_000);
      expect(ms).toBeLessThanOrEqual(180_000);
    }
  });
});

describe("audit tax", () => {
  it("audit tax scales with low credit and is capped by auditImmune", () => {
    const s = newGame(0);
    s.credit = 800; expect(auditTaxRate(s)).toBe(0);
    s.credit = 700; expect(auditTaxRate(s)).toBeCloseTo(0.05);
    s.credit = 600; expect(auditTaxRate(s)).toBeCloseTo(0.12);
    s.credit = 400; expect(auditTaxRate(s)).toBeCloseTo(0.25);
    s.upgrades = ["a-cert"]; expect(auditTaxRate(s)).toBeCloseTo(0.05);   // capped
  });

  it("idle income is reduced by audit tax", () => {
    const s = newGame(0); s.producers[0] = 100; s.credit = 400;   // 25% tax
    const gained = tick(s, 1, 0);
    const gross = 100 * 0.1;                                       // baseRate
    expect(gained).toBeCloseTo(gross * 0.75, 5);
  });
});

describe("click combo", () => {
  it("combo ramps within window, caps at ×3, resets after window", () => {
    const s = newGame(0);
    for (let i = 0; i < 200; i++) click(s, i * 100);      // 100ms apart, within 1500ms window
    expect(comboMult(s)).toBeCloseTo(3, 1);                // capped
    click(s, 999999);                                      // long gap → reset
    expect(s.clickCombo.count).toBe(1);
  });

  it("clicking raises credit via trickle", () => {
    const s = newGame(0); s.credit = 650;
    click(s, 0);
    expect(s.credit).toBeGreaterThan(650);
  });
});

describe("prestige", () => {
  it("locked until threshold; first prestige gives exactly 1 barami", () => {
    const s = newGame(0);
    expect(canPrestige(s)).toBe(false);
    s.totalBoon = 1e8;
    expect(canPrestige(s)).toBe(true);
    expect(baramiGain(s)).toBe(1);
    s.totalBoon = 1e10;
    expect(baramiGain(s)).toBe(10);
  });
  it("prestige resets run but keeps barami/achievements/allTime", () => {
    const s = newGame(0);
    s.totalBoon = 1e8; s.allTimeBoon = 1e8; s.boon = 5; s.producers[0] = 3;
    s.upgrades.push("a-ring"); s.clickTier = 2; s.achievements.push("first-click");
    prestige(s, 0);
    expect(s.barami).toBe(1); expect(s.lives).toBe(2);
    expect(s.boon).toBe(0); expect(s.producers[0]).toBe(0);
    expect(s.upgrades).toEqual([]); expect(s.clickTier).toBe(0);
    expect(s.allTimeBoon).toBe(1e8); expect(s.achievements).toContain("first-click");
  });
  it("barami boosts production", () => {
    const s = newGame(0); s.producers[0] = 10;
    const before = boonPerSecond(s, 0);
    s.barami = 20; // +100% at 0.05/point
    expect(boonPerSecond(s, 0)).toBeCloseTo(before * 2);
  });
  it("rebirth ladder and nirvana gate", () => {
    const s = newGame(0);
    expect(rebirthTier(s).name).toBe("หมาวัด");
    s.barami = 250;
    expect(rebirthTier(s).name).toBe("เทวดา");
    s.barami = 2500;
    expect(rebirthTier(s).name).toBe("พรหม");
    expect(canNirvana(s)).toBe(false);
    s.barami = 10_000;
    expect(canNirvana(s)).toBe(true);
    nirvana(s);
    expect(s.completed).toBe(true);
    expect(s.barami).toBe(10_000); // nothing destroyed
    reenter(s);
    expect(s.completed).toBe(false);
    expect(s.barami).toBe(10_000);
  });
  it("creditBonus is 0.7 at 300, 1.0 at 650, 1.5 at 900", () => {
    expect(creditBonus(300)).toBeCloseTo(0.7);
    expect(creditBonus(650)).toBeCloseTo(1.0);
    expect(creditBonus(900)).toBeCloseTo(1.5);
    expect(creditBonus(475)).toBeCloseTo(0.85, 1);   // midpoint of low half
  });
  it("baramiGain scales with tier momentum and credit", () => {
    const base = newGame(0);
    base.totalBoon = 1e8 * 100;          // sqrt = 10
    base.credit = 650;                   // bonus 1.0
    base.barami = 0;                     // tier 0 → momentum 1.0
    expect(baramiGain(base)).toBe(10);
    base.barami = 200;                   // เทวดา = index 4 → momentum 1.4
    expect(baramiGain(base)).toBe(14);
    base.credit = 900;                   // bonus 1.5 → 10×1.4×1.5 = 21
    expect(baramiGain(base)).toBe(21);
  });
  it("monetize-heavy build has a low target, wholesome-heavy a high one", () => {
    const mon = newGame(0); mon.producers[8] = 50;           // BunCoin only
    const who = newGame(0); who.producers[0] = 50;           // ใส่บาตร only
    expect(creditTarget(mon)).toBeLessThan(500);
    expect(creditTarget(who)).toBeGreaterThan(750);
  });
  it("creditTick drifts toward target and clamps, decaying overshoot", () => {
    const s = newGame(0); s.producers[8] = 50; s.credit = 900;   // overshoot above low target
    creditTick(s, 1);
    expect(s.credit).toBeLessThan(900);                          // decays toward low target
    expect(s.credit).toBeGreaterThanOrEqual(300);
  });
});

describe("loan", () => {
  it("takeLoan gives a lump, drops credit, and is repaid via income siphon", () => {
    const s = newGame(0); s.producers[0] = 1000; s.credit = 700;
    const bps = boonPerSecond(s, 0);
    const before = s.boon;
    expect(takeLoan(s, 0)).toBe(true);
    expect(s.boon).toBeCloseTo(before + bps * 450, 3);
    expect(s.credit).toBeLessThan(700);
    expect(s.loan).not.toBeNull();
    expect(takeLoan(s, 0)).toBe(false);           // only one active loan
    for (let t = 0; t < 5000; t++) tick(s, 1, t * 1000);
    expect(s.loan).toBeNull();                     // fully repaid
  });

  it("prestige clears an outstanding loan", () => {
    const s = newGame(0); s.producers[0] = 1000; s.totalBoon = 1e8; takeLoan(s, 0);
    prestige(s, 0);
    expect(s.loan).toBeNull();
  });
});
