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

export function boonPerClick(s: GameState, now = Date.now()): number {
  const m = upgradeMults(s); const b = activeBuffMults(s, now);
  return CLICK_TIERS[s.clickTier]!.baseClick * m.clickMult * baramiMult(s) * b.click * b.all;
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

export function click(s: GameState, now = Date.now()): number {
  s.stats.clicks++;
  return gain(s, boonPerClick(s, now), activeBuffMults(s, now).taxRate);
}

export function tick(s: GameState, dtSec: number, now = Date.now()): number {
  return gain(s, boonPerSecond(s, now) * dtSec, activeBuffMults(s, now).taxRate);
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
}

export function pruneBuffs(s: GameState, now: number): void {
  s.buffs = s.buffs.filter(b => b.endsAt > now);
}

export function nextEventDelayMs(rand: () => number = Math.random): number {
  const { eventMinGapSec: a, eventMaxGapSec: b } = TUNING;
  return (a + rand() * (b - a)) * 1000;
}

export const canPrestige = (s: GameState) => s.totalBoon >= TUNING.prestigeUnlockBoon;
export const baramiGain = (s: GameState) =>
  Math.floor(Math.sqrt(s.totalBoon / TUNING.prestigeUnlockBoon));

function resetRun(s: GameState): void {
  s.boon = 0; s.totalBoon = 0;
  s.producers = PRODUCERS.map(() => 0);
  s.upgrades = []; s.clickTier = 0; s.buffs = [];
}

export function prestige(s: GameState, now = Date.now()): void {
  if (!canPrestige(s)) return;
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
export function reenter(s: GameState): void { s.completed = false; resetRun(s); }
