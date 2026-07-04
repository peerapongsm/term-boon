import { load, save, applyOffline } from "./lib/save";
import { tick, pruneBuffs, nextEventDelayMs, triggerEvent, creditTick } from "./lib/engine";
import { EVENTS, TUNING } from "./lib/data";
import { formatBoon } from "./lib/units";
import { renderAll, bindUI, showToast, showEventBanner, unlockAchievement } from "./ui";
import { playSfx } from "./lib/audio";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function applyOfflineAndReport(state: ReturnType<typeof load>, prevSeen: number): void {
  const gained = applyOffline(state, Date.now());
  if (gained > 0) showToast(`ระหว่างที่ท่านจากไป ตู้บริจาครับไป ${formatBoon(gained)} บุญ`);
  if (Date.now() - prevSeen > ONE_DAY_MS) unlockAchievement(state, "true-merit");
}

const state = load();
// dev-only inspection hook for manual testing (e.g. state.barami = 10000 in console)
if (import.meta.env.DEV) (window as unknown as { __state: typeof state }).__state = state;
applyOfflineAndReport(state, state.lastSeen);

bindUI(state);

let last = performance.now();
let nextEventAt = Date.now() + nextEventDelayMs();

function frame(t: number) {
  const now = Date.now();
  const dt = Math.min((t - last) / 1000, 1); // clamp: background tab catch-up handled by applyOffline on visibility
  last = t;
  if (!state.completed) {
    tick(state, dt, now);
    creditTick(state, dt, now);
    pruneBuffs(state, now);
    if (now >= nextEventAt) {
      const pool = EVENTS.filter(e => e.random !== false);
      const ev = pool[Math.floor(Math.random() * pool.length)]!;
      showEventBanner(ev, () => { triggerEvent(state, ev.id, Date.now()); playSfx("bell"); });
      nextEventAt = now + nextEventDelayMs() + TUNING.eventVisibleSec * 1000;
    }
  }
  renderAll(state, now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

setInterval(() => { state.lastSeen = Date.now(); save(state); }, 5000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) { state.lastSeen = Date.now(); save(state); }
  else { applyOfflineAndReport(state, state.lastSeen); }
});
