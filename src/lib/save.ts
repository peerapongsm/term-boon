import { GameState, newGame, boonPerSecond } from "./engine";
import { PRODUCERS, UPGRADES, ACHIEVEMENTS, TUNING } from "./data";

const KEY = "term-boon-save-v1";
const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1e300) : fallback;
};

export const serialize = (s: GameState) => JSON.stringify({ v: 1, state: s });

export function deserialize(raw: string | null, now = Date.now()): GameState {
  const fresh = newGame(now);
  if (!raw) return fresh;
  let doc: unknown;
  try { doc = JSON.parse(raw); } catch { return fresh; }
  if (typeof doc !== "object" || doc === null || (doc as { v?: unknown }).v !== 1) return fresh;
  const s = (doc as { state?: Partial<GameState> }).state ?? {};
  const upgradeIds = new Set(UPGRADES.map(u => u.id));
  const achIds = new Set(ACHIEVEMENTS.map(a => a.id));
  return {
    boon: num(s.boon), totalBoon: num(s.totalBoon), allTimeBoon: num(s.allTimeBoon),
    producers: PRODUCERS.map((_, i) => Math.floor(num((s.producers ?? [])[i]))),
    upgrades: [...new Set((Array.isArray(s.upgrades) ? s.upgrades : []).filter((x): x is string => typeof x === "string" && upgradeIds.has(x)))],
    clickTier: Math.min(Math.floor(num(s.clickTier)), 4),
    barami: num(s.barami), lives: Math.max(1, Math.floor(num(s.lives, 1))),
    completed: s.completed === true, buffs: [], // buffs never persist across load
    achievements: [...new Set((Array.isArray(s.achievements) ? s.achievements : []).filter((x): x is string => typeof x === "string" && achIds.has(x)))],
    stats: { clicks: Math.floor(num(s.stats?.clicks)), mediaTaxPaid: num(s.stats?.mediaTaxPaid) },
    lastSeen: Math.min(num(s.lastSeen, now), now),
  };
}

export const offlineHours = (s: GameState) =>
  TUNING.offlineCapHours + UPGRADES
    .filter(u => s.upgrades.includes(u.id) && u.effect.kind === "offlineCap")
    .reduce((h, u) => h + (u.effect.kind === "offlineCap" ? u.effect.addHours : 0), 0);

export function applyOffline(s: GameState, now: number): number {
  const elapsedSec = Math.max(0, (now - s.lastSeen) / 1000);
  s.lastSeen = now;
  if (elapsedSec < 60) return 0;
  const capped = Math.min(elapsedSec, offlineHours(s) * 3600);
  const gained = boonPerSecond(s, now) * capped;
  s.boon += gained; s.totalBoon += gained; s.allTimeBoon += gained;
  return gained;
}

export const save = (s: GameState) => localStorage.setItem(KEY, serialize(s));
export const load = (now = Date.now()) => deserialize(localStorage.getItem(KEY), now);
