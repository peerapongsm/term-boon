import { PRODUCERS, CLICK_TIERS, UPGRADES, TUNING, EVENTS, REBIRTH_TIERS } from "./data";

export interface ActiveBuff { eventId: string; endsAt: number } // epoch ms
export interface GameState {
  boon: number; totalBoon: number; allTimeBoon: number;
  producers: number[];           // length 11
  upgrades: string[];            // purchased upgrade ids
  clickTier: number;             // 0..4 (index of highest owned tier)
  barami: number; lives: number; completed: boolean;
  buffs: ActiveBuff[];
  achievements: string[];
  stats: { clicks: number; mediaTaxPaid: number };
  credit: number;                                        // 300–900, per-life
  loan: { principal: number; remaining: number; interestRate: number } | null;
  clickCombo: { count: number; lastClickMs: number };
  lastAdMs: number;                                      // epoch ms of last ad watch
  samsara: number;                                       // post-นิพพาน reenter count
  lastSeen: number;
}

export function newGame(now = Date.now()): GameState {
  return {
    boon: 0, totalBoon: 0, allTimeBoon: 0,
    producers: PRODUCERS.map(() => 0), upgrades: [], clickTier: 0,
    barami: 0, lives: 1, completed: false, buffs: [],
    achievements: [], stats: { clicks: 0, mediaTaxPaid: 0 },
    credit: 650, loan: null, clickCombo: { count: 0, lastClickMs: 0 },
    lastAdMs: 0, samsara: 0,
    lastSeen: now,
  };
}

export const producerCost = (i: number, owned: number) =>
  PRODUCERS[i]!.baseCost * Math.pow(TUNING.costGrowth, owned);
export const clickTierCost = (t: number) => CLICK_TIERS[t]!.cost;

function upgradeMults(s: GameState) {
  let clickMult = 1, buffDur = 1, offlineAdd = 0, creditDrift = 0, auditImmune = false;
  const prodMult = PRODUCERS.map(() => 1);
  let prodAll = 1;
  for (const id of s.upgrades) {
    const u = UPGRADES.find(x => x.id === id); if (!u) continue;
    const e = u.effect;
    if (e.kind === "click") clickMult *= e.mult;
    else if (e.kind === "buffDur") buffDur *= e.mult;
    else if (e.kind === "offlineCap") offlineAdd += e.addHours;
    else if (e.kind === "creditDrift") creditDrift += e.add;
    else if (e.kind === "auditImmune") auditImmune = true;
    else if (e.target === "all") prodAll *= e.mult;
    else prodMult[e.target] = prodMult[e.target]! * e.mult;
  }
  return { clickMult, buffDur, offlineAdd, prodMult, prodAll, creditDrift, auditImmune };
}

export const creditDriftFromUpgrades = (s: GameState) => upgradeMults(s).creditDrift;
export const hasAuditImmune = (s: GameState) => upgradeMults(s).auditImmune;

function activeBuffMults(s: GameState, now: number) {
  let clickMult = 1, allMult = 1, taxRate = 0;
  for (const b of s.buffs) {
    if (b.endsAt <= now) continue;
    const ev = EVENTS.find(e => e.id === b.eventId); if (!ev) continue;
    clickMult *= ev.effect.clickMult ?? 1;
    allMult *= ev.effect.allMult ?? 1;
    taxRate = Math.max(taxRate, ev.effect.taxRate ?? 0);
  }
  return { click: clickMult, all: allMult, taxRate };
}

const baramiMult = (s: GameState) => 1 + TUNING.baramiProdBonus * s.barami;

export const comboMult = (s: GameState) =>
  1 + Math.min(Math.max(0, s.clickCombo.count - 1) * TUNING.comboStep, TUNING.comboCap);

export function boonPerClick(s: GameState, now = Date.now()): number {
  const m = upgradeMults(s); const b = activeBuffMults(s, now);
  return CLICK_TIERS[s.clickTier]!.baseClick * m.clickMult * baramiMult(s) * b.click * b.all * comboMult(s);
}

export function boonPerSecond(s: GameState, now = Date.now()): number {
  const m = upgradeMults(s); const b = activeBuffMults(s, now);
  let sum = 0;
  for (let i = 0; i < PRODUCERS.length; i++)
    sum += s.producers[i]! * PRODUCERS[i]!.baseRate * m.prodMult[i]!;
  return sum * m.prodAll * baramiMult(s) * b.all;
}

function gain(s: GameState, amount: number, taxRate: number): number {
  const taxed = amount * (1 - taxRate);
  s.stats.mediaTaxPaid += amount - taxed;
  s.boon += taxed; s.totalBoon += taxed; s.allTimeBoon += taxed;
  return taxed;
}

export function auditTaxRate(s: GameState): number {
  let rate: number;
  if (s.credit >= 750) rate = 0;
  else if (s.credit >= 650) rate = 0.05;
  else if (s.credit >= 500) rate = 0.12;
  else rate = 0.25;
  if (upgradeMults(s).auditImmune) rate = Math.min(rate, TUNING.auditImmuneCap);
  return rate;
}

export function click(s: GameState, now = Date.now()): number {
  // update combo BEFORE computing click value so the combo mult applies to this click
  if (now - s.clickCombo.lastClickMs > TUNING.comboWindowMs) s.clickCombo.count = 1;
  else s.clickCombo.count++;
  s.clickCombo.lastClickMs = now;
  s.stats.clicks++;
  const tax = Math.max(activeBuffMults(s, now).taxRate, auditTaxRate(s));
  const gained = gain(s, boonPerClick(s, now), tax);
  s.credit = Math.min(TUNING.creditMax, s.credit + TUNING.clickCreditTrickle * comboMult(s));
  return gained;
}

export function takeLoan(s: GameState, now = Date.now()): boolean {
  if (s.loan) return false;
  const bps = boonPerSecond(s, now);
  if (bps <= 0) return false;
  const principal = bps * TUNING.loanLumpSeconds;
  s.boon += principal; s.totalBoon += principal; s.allTimeBoon += principal;
  s.loan = { principal, remaining: principal * (1 + TUNING.loanInterest), interestRate: TUNING.loanInterest };
  s.credit = Math.max(TUNING.creditMin, s.credit - 80);   // instant credit drop (decays back via creditTick)
  return true;
}

export function tick(s: GameState, dtSec: number, now = Date.now()): number {
  const tax = Math.max(activeBuffMults(s, now).taxRate, auditTaxRate(s));
  const gained = gain(s, boonPerSecond(s, now) * dtSec, tax);
  if (s.loan) {
    const pay = Math.min(gained * TUNING.loanSiphon, s.loan.remaining, s.boon);
    s.boon -= pay; s.loan.remaining -= pay;
    if (s.loan.remaining <= 0) s.loan = null;
  }
  return gained;
}

export function buyProducer(s: GameState, i: number): boolean {
  const cost = producerCost(i, s.producers[i]!);
  if (s.boon < cost) return false;
  s.boon -= cost; s.producers[i] = (s.producers[i] ?? 0) + 1;
  return true;
}

export function buyClickTier(s: GameState, tier: number): boolean {
  if (tier !== s.clickTier + 1) return false;
  if (tier >= CLICK_TIERS.length) return false;
  const cost = clickTierCost(tier);
  if (s.boon < cost) return false;
  s.boon -= cost; s.clickTier = tier;
  return true;
}

export function buyUpgrade(s: GameState, id: string): boolean {
  if (s.upgrades.includes(id)) return false;
  const u = UPGRADES.find(x => x.id === id); if (!u) return false;
  if (u.requires && (s.producers[u.requires.producer] ?? 0) < u.requires.count) return false;
  if (s.boon < u.cost) return false;
  s.boon -= u.cost; s.upgrades.push(id);
  return true;
}

export function availableUpgrades(s: GameState) {
  return UPGRADES.filter(u => !s.upgrades.includes(u.id) &&
    (!u.requires || (s.producers[u.requires.producer] ?? 0) >= u.requires.count));
}

export function triggerEvent(s: GameState, eventId: string, now: number): void {
  const ev = EVENTS.find(e => e.id === eventId); if (!ev) return;
  const dur = ev.durationSec * 1000 * upgradeMults(s).buffDur;
  s.buffs.push({ eventId, endsAt: now + dur });
  if (ev.effect.creditDelta) {
    s.credit = Math.min(TUNING.creditMax, Math.max(TUNING.creditMin, s.credit + ev.effect.creditDelta));
  }
}

export function pruneBuffs(s: GameState, now: number): void {
  s.buffs = s.buffs.filter(b => b.endsAt > now);
}

export function nextEventDelayMs(rand: () => number = Math.random): number {
  const { eventMinGapSec: a, eventMaxGapSec: b } = TUNING;
  return (a + rand() * (b - a)) * 1000;
}

export const canPrestige = (s: GameState) => s.totalBoon >= TUNING.prestigeUnlockBoon;

export function creditBonus(credit: number): number {
  if (credit <= 650) return 0.7 + (credit - 300) / (650 - 300) * (1.0 - 0.7);
  return 1.0 + (credit - 650) / (900 - 650) * (1.5 - 1.0);
}

export function creditTarget(s: GameState, now = Date.now()): number {
  const m = upgradeMults(s);
  let mon = 0, who = 0, total = 0;
  for (let i = 0; i < PRODUCERS.length; i++) {
    const bps = s.producers[i]! * PRODUCERS[i]!.baseRate * m.prodMult[i]!;
    total += bps;
    if (PRODUCERS[i]!.klass === "monetize") mon += bps;
    else if (PRODUCERS[i]!.klass === "wholesome") who += bps;
  }
  const monShare = total > 0 ? mon / total : 0;
  const whoShare = total > 0 ? who / total : 0;
  const raw = TUNING.creditBaseline
    - TUNING.creditShareMonetize * monShare
    + TUNING.creditShareWholesome * whoShare
    + m.creditDrift;
  return Math.min(Math.max(raw, TUNING.creditMin), TUNING.creditMax);
}

export function creditTick(s: GameState, dtSec: number, now = Date.now()): void {
  const target = creditTarget(s, now);
  const step = TUNING.creditDriftPerSec * dtSec;
  const activelyClicking = now - s.clickCombo.lastClickMs < TUNING.comboWindowMs;
  if (s.credit < target) s.credit = Math.min(target, s.credit + step);
  else if (s.credit > target && !activelyClicking) s.credit = Math.max(target, s.credit - step);
  // while actively clicking and above target: hold — the per-click trickle raises credit
  s.credit = Math.min(Math.max(s.credit, TUNING.creditMin), TUNING.creditMax);
}

export function rebirthTierIndex(s: GameState): number {
  let idx = 0;
  for (let i = 0; i < REBIRTH_TIERS.length; i++) if (s.barami >= REBIRTH_TIERS[i]!.baramiFloor) idx = i;
  return idx;
}

export const baramiGain = (s: GameState) =>
  Math.floor(
    Math.sqrt(s.totalBoon / TUNING.prestigeUnlockBoon) *
    (1 + TUNING.momentumPerTier * rebirthTierIndex(s)) *
    creditBonus(s.credit),
  );

function resetRun(s: GameState): void {
  s.boon = 0; s.totalBoon = 0;
  s.producers = PRODUCERS.map(() => 0);
  s.upgrades = []; s.clickTier = 0; s.buffs = [];
  s.loan = null; s.clickCombo = { count: 0, lastClickMs: 0 };
}

const DEVA_INDEX = REBIRTH_TIERS.findIndex(t => t.name === "เทวดา");

export function prestigeBlockedByCredit(s: GameState): boolean {
  if (!canPrestige(s)) return false;
  const afterBarami = s.barami + baramiGain(s);
  let reachedIdx = 0;
  for (let i = 0; i < REBIRTH_TIERS.length; i++) if (afterBarami >= REBIRTH_TIERS[i]!.baramiFloor) reachedIdx = i;
  return reachedIdx >= DEVA_INDEX && s.credit < TUNING.creditGateFloor;
}

export function prestige(s: GameState, now = Date.now()): void {
  if (!canPrestige(s) || prestigeBlockedByCredit(s)) return;
  s.barami += baramiGain(s); s.lives++; s.lastSeen = now;
  resetRun(s);
}

export function rebirthTier(s: GameState) {
  let tier = REBIRTH_TIERS[0]!;
  for (const t of REBIRTH_TIERS) if (s.barami >= t.baramiFloor) tier = t;
  return tier;
}

export const canNirvana = (s: GameState) =>
  rebirthTier(s) === REBIRTH_TIERS[REBIRTH_TIERS.length - 1] && s.barami >= TUNING.nirvanaBarami;

export function nirvana(s: GameState): void { if (canNirvana(s)) s.completed = true; }
export function reenter(s: GameState): void { s.completed = false; s.samsara++; resetRun(s); }

export function adReady(s: GameState, now = Date.now()): boolean {
  return s.lives >= 2 && (s.lastAdMs === 0 || now - s.lastAdMs >= TUNING.adCooldownSec * 1000);
}

const AD_LUMP_FLOOR = 1000;   // avoids a worthless early lump

export function watchAd(s: GameState, reward: "buff" | "lump" | "credit", now = Date.now()): boolean {
  if (!adReady(s, now)) return false;
  s.lastAdMs = now;
  if (reward === "buff") triggerEvent(s, "ad-x2", now);
  else if (reward === "lump") {
    const lump = Math.max(TUNING.adLumpSeconds * boonPerSecond(s, now), AD_LUMP_FLOOR);
    s.boon += lump; s.totalBoon += lump; s.allTimeBoon += lump;
  } else {
    s.credit = Math.min(TUNING.creditMax, s.credit + TUNING.adCreditReward);
  }
  return true;
}
