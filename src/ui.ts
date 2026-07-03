import {
  GameState, click, buyProducer, buyClickTier, buyUpgrade, availableUpgrades,
  boonPerSecond, producerCost, canPrestige, baramiGain, prestige, rebirthTier,
  canNirvana, nirvana,
} from "./lib/engine";
import { PRODUCERS, CLICK_TIERS, UPGRADES, REBIRTH_TIERS, ACHIEVEMENTS, EVENTS, TUNING, GameEvent } from "./lib/data";
import { formatBoon, fullBreakdown, unitFor } from "./lib/units";
import { initAudio, playSfx, setMuted, isMuted } from "./lib/audio";
import { save } from "./lib/save";

// ---- DOM refs (cached once at module init; DOM is already parsed since
// main.ts is a module script placed at end of <body>) ----
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const boonDisplay = $<HTMLElement>("boon-display");
const bpsDisplay = $<HTMLElement>("bps-display");
const rebirthBadge = $<HTMLElement>("rebirth-badge");
const muteBtn = $<HTMLButtonElement>("mute-btn");
const eventBanner = $<HTMLElement>("event-banner");
const eventClaim = $<HTMLButtonElement>("event-claim");
const clickable = $<HTMLButtonElement>("clickable");
const clickTierArt = $<HTMLElement>("click-tier-art");
const clickTierName = $<HTMLElement>("click-tier-name");
const clickTierBuyBtn = $<HTMLButtonElement>("click-tier-buy");
const floatLayer = $<HTMLElement>("float-layer");
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
const panelServices = $<HTMLElement>("panel-services");
const panelUpgrades = $<HTMLElement>("panel-upgrades");
const panelProfile = $<HTMLElement>("panel-profile");
const achievementsList = $<HTMLElement>("achievements-list");
const statsBlock = $<HTMLElement>("stats-block");
const prestigeBtn = $<HTMLButtonElement>("prestige-btn");
const nirvanaBtn = $<HTMLButtonElement>("nirvana-btn");
const toastLayer = $<HTMLElement>("toast-layer");
const confirmDialog = $<HTMLDialogElement>("confirm-dialog");

// buff countdown pill layer: no dedicated element in index.html (Task 12 is
// ui.ts/style.css-only), so it's created once here and appended to the
// balance card, same pattern as other dynamically-built content in this file.
const balanceCard = document.querySelector<HTMLElement>(".balance-card")!;
const buffPillLayer = document.createElement("div");
buffPillLayer.id = "buff-pills";
buffPillLayer.className = "buff-pills";
balanceCard.appendChild(buffPillLayer);

const CLICK_TIER_EMOJI = ["🪙", "🍚", "🎁", "✨", "📱"];

const UNIT_TOASTS: Record<string, string> = {
  "โกฏิ": "ท่านถึงหน่วย โกฏิ แล้ว — สิบล้านบุญ!",
  "ปโกฏิ": "ท่านถึงหน่วย ปโกฏิ แล้ว!",
  "โกฏิปโกฏิ": "ท่านถึงหน่วย โกฏิปโกฏิ แล้ว!",
};

// ---- toast / event banner ----

export function showToast(msg: string): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  toastLayer.appendChild(el);
  setTimeout(() => el.classList.add("toast-out"), 2200);
  setTimeout(() => el.remove(), 2600);
}

let bannerTimer: ReturnType<typeof setTimeout> | undefined;
function hideBanner(): void {
  eventBanner.hidden = true;
  eventClaim.onclick = null;
}
export function showEventBanner(ev: GameEvent, onClaim: () => void): void {
  // styled as a push notification (app parody): icon + app label + title + body
  eventClaim.innerHTML = `
    <span class="event-icon">🔔</span>
    <span class="event-body">
      <span class="event-app">บุญWallet แจ้งเตือน</span>
      <span class="event-title">${ev.name}</span>
      <span class="event-desc">${ev.desc}</span>
    </span>
  `;
  eventBanner.hidden = false;
  eventClaim.onclick = () => { onClaim(); hideBanner(); };
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(hideBanner, TUNING.eventVisibleSec * 1000);
}

// ---- buff countdown pill (near balance) ----

let lastBuffSig = "";
let daraTaxSnapshot: number | null = null;

function renderBuffPill(s: GameState, now: number): void {
  const active = s.buffs.filter(b => b.endsAt > now);
  const sig = active.map(b => b.eventId).join(",");
  if (sig !== lastBuffSig) {
    lastBuffSig = sig;
    buffPillLayer.innerHTML = active
      .map(b => `<span class="buff-pill" data-event="${b.eventId}"></span>`)
      .join("");
  }

  const hasDara = active.some(b => b.eventId === "dara");
  if (hasDara && daraTaxSnapshot === null) daraTaxSnapshot = s.stats.mediaTaxPaid;
  if (!hasDara) daraTaxSnapshot = null;

  buffPillLayer.querySelectorAll<HTMLElement>(".buff-pill").forEach(pill => {
    const b = active.find(x => x.eventId === pill.dataset.event);
    const ev = b && EVENTS.find(e => e.id === b.eventId);
    if (!b || !ev) return;
    const secLeft = Math.max(0, Math.ceil((b.endsAt - now) / 1000));
    let text = `${ev.name} · ${secLeft} วิ`;
    if (ev.id === "dara" && daraTaxSnapshot !== null) {
      text += ` · ค่าออกสื่อ ${formatBoon(s.stats.mediaTaxPaid - daraTaxSnapshot)} บุญ`;
    }
    pill.textContent = text;
  });
}

// ---- achievements ----

export function unlockAchievement(s: GameState, id: string): void {
  if (s.achievements.includes(id)) return;
  s.achievements.push(id);
  const ach = ACHIEVEMENTS.find(a => a.id === id);
  showToast(ach ? `🏆 ${ach.name} — ${ach.desc}` : `ปลดล็อกความสำเร็จ: ${id}`);
  save(s);
}

function checkAchievements(s: GameState): void {
  if (s.stats.clicks >= 1) unlockAchievement(s, "first-click");
  if (s.producers.some(c => c > 0)) unlockAchievement(s, "first-producer");
  if (s.allTimeBoon >= 1e7) unlockAchievement(s, "kot");
  if ((s.producers[2] ?? 0) >= 25) unlockAchievement(s, "birds-25");
  if (s.producers.every(c => c > 0)) unlockAchievement(s, "all-producers");
  if (s.stats.clicks >= 1000) unlockAchievement(s, "clicks-1000");
  if (s.lives >= 2) unlockAchievement(s, "first-prestige");
  const devaIdx = REBIRTH_TIERS.findIndex(t => t.name === "เทวดา");
  const curIdx = REBIRTH_TIERS.findIndex(t => t.name === rebirthTier(s).name);
  if (devaIdx !== -1 && curIdx >= devaIdx) unlockAchievement(s, "deva");
  if (s.completed) unlockAchievement(s, "nirvana");
}

// ---- float / shake fx ----

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function spawnFloat(gain: number): void {
  if (reducedMotion()) return;
  const span = document.createElement("span");
  span.className = "float-plus";
  span.textContent = `+${formatBoon(gain)}`;
  span.style.left = `${40 + Math.random() * 20}%`;
  span.addEventListener("animationend", () => span.remove());
  floatLayer.appendChild(span);
}

function shake(): void {
  clickable.classList.remove("shake");
  void clickable.offsetWidth; // restart animation
  clickable.classList.add("shake");
}

// ---- tabs ----

function switchTab(name: string): void {
  tabs.forEach(t => t.classList.toggle("active", t.dataset.panel === name));
  panelServices.hidden = name !== "services";
  panelUpgrades.hidden = name !== "upgrades";
  panelProfile.hidden = name !== "profile";
}

// ---- confirm dialog (Task 13 fills full content/copy) ----

function openConfirm(title: string, message: string, onConfirm: () => void): void {
  confirmDialog.innerHTML = "";
  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-form";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  const p = document.createElement("p");
  p.textContent = message;
  const actions = document.createElement("div");
  actions.className = "confirm-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.value = "cancel";
  cancelBtn.className = "secondary-btn";
  cancelBtn.textContent = "ยกเลิก";
  const confirmBtn = document.createElement("button");
  confirmBtn.value = "confirm";
  confirmBtn.className = "danger-btn";
  confirmBtn.textContent = "ยืนยัน";
  actions.append(cancelBtn, confirmBtn);
  form.append(h3, p, actions);
  confirmDialog.appendChild(form);
  confirmDialog.showModal();
  confirmDialog.addEventListener("close", function handler() {
    if (confirmDialog.returnValue === "confirm") onConfirm();
    confirmDialog.removeEventListener("close", handler);
  });
}

// ---- render: balance / rebirth ----

function renderBalance(s: GameState, now: number): void {
  boonDisplay.textContent = formatBoon(s.boon);
  bpsDisplay.textContent = `+${formatBoon(boonPerSecond(s, now))} บุญ/วิ`;
  rebirthBadge.textContent = `ภพ: ${rebirthTier(s).name}`;
}

// ---- render: click tier ----

function renderClickTier(s: GameState): void {
  clickTierName.textContent = CLICK_TIERS[s.clickTier]!.name;
  clickTierArt.textContent = CLICK_TIER_EMOJI[s.clickTier] ?? "🪙";
  clickTierArt.dataset.tier = String(s.clickTier);

  const nextTier = s.clickTier + 1;
  if (nextTier >= CLICK_TIERS.length) {
    clickTierBuyBtn.hidden = true;
    return;
  }
  const next = CLICK_TIERS[nextTier]!;
  clickTierBuyBtn.hidden = false;
  clickTierBuyBtn.textContent = `อัปเกรดเป็น "${next.name}" — ${formatBoon(next.cost)} บุญ`;
  clickTierBuyBtn.classList.toggle("unaffordable", s.boon < next.cost);
}

// ---- render: producer (service) rows ----

const revealed: boolean[] = PRODUCERS.map(() => false);
let lastProducersSig = "";

function renderProducers(s: GameState): void {
  for (let i = 0; i < PRODUCERS.length; i++) {
    if (!revealed[i] && ((s.producers[i] ?? 0) > 0 || s.boon >= PRODUCERS[i]!.baseCost * 0.5)) revealed[i] = true;
  }
  const sig = s.producers.map((c, i) => `${c}:${revealed[i] ? 1 : 0}`).join(",");
  if (sig !== lastProducersSig) {
    lastProducersSig = sig;
    panelServices.innerHTML = PRODUCERS.map((p, i) => {
      if (!revealed[i]) {
        return `<div class="service-row locked" aria-disabled="true">
          <span class="service-name">???</span>
          <span class="service-cost">???</span>
        </div>`;
      }
      const owned = s.producers[i] ?? 0;
      const cost = producerCost(i, owned);
      return `<button class="service-row" data-i="${i}">
        <span class="service-name">${p.name}</span>
        <span class="service-flavor">${p.flavor}</span>
        <span class="service-owned">×${owned}</span>
        <span class="service-cost">${formatBoon(cost)} บุญ</span>
      </button>`;
    }).join("");
  }
  panelServices.querySelectorAll<HTMLButtonElement>(".service-row[data-i]").forEach(row => {
    const i = Number(row.dataset.i);
    const cost = producerCost(i, s.producers[i] ?? 0);
    row.classList.toggle("unaffordable", s.boon < cost);
  });
}

// ---- render: upgrade (amulet) rows ----

let lastUpgradesSig = "";

function renderUpgrades(s: GameState): void {
  const avail = availableUpgrades(s);
  const nextTier = s.clickTier + 1;
  const showTierRow = nextTier < CLICK_TIERS.length;
  const sig = `${showTierRow ? nextTier : "-"}|${avail.map(u => u.id).join(",")}`;
  if (sig !== lastUpgradesSig) {
    lastUpgradesSig = sig;
    const tierRowHtml = showTierRow
      ? `<button class="upgrade-row click-tier-row" data-clicktier="${nextTier}">
          <span class="upgrade-name">อัปเกรดเป็น "${CLICK_TIERS[nextTier]!.name}"</span>
          <span class="upgrade-cost">${formatBoon(CLICK_TIERS[nextTier]!.cost)} บุญ</span>
        </button>`
      : "";
    const upgradeRowsHtml = avail.map(u => `
        <button class="upgrade-row${u.id.startsWith("a-") ? " amulet" : ""}" data-id="${u.id}">
          <span class="upgrade-name">${u.name}</span>
          <span class="upgrade-flavor">${u.flavor}</span>
          <span class="upgrade-cost">${formatBoon(u.cost)} บุญ</span>
        </button>`).join("");
    panelUpgrades.innerHTML = tierRowHtml + upgradeRowsHtml ||
      `<p class="empty-hint">ยังไม่มีเครื่องรางให้ซื้อในตอนนี้</p>`;
  }
  panelUpgrades.querySelectorAll<HTMLButtonElement>(".upgrade-row[data-id]").forEach(row => {
    const u = UPGRADES.find(x => x.id === row.dataset.id);
    if (u) row.classList.toggle("unaffordable", s.boon < u.cost);
  });
  const tierRow = panelUpgrades.querySelector<HTMLButtonElement>(".upgrade-row[data-clicktier]");
  if (tierRow) tierRow.classList.toggle("unaffordable", s.boon < CLICK_TIERS[nextTier]!.cost);
}

// ---- render: prestige / nirvana ----

function renderPrestigeNirvana(s: GameState): void {
  prestigeBtn.hidden = !canPrestige(s);
  nirvanaBtn.hidden = !canNirvana(s);
}

// ---- render: achievements ----

let lastAchSig = "";

function renderAchievements(s: GameState): void {
  const sig = s.achievements.join(",");
  if (sig === lastAchSig) return;
  lastAchSig = sig;
  achievementsList.innerHTML = ACHIEVEMENTS.map(a => {
    const unlocked = s.achievements.includes(a.id);
    const masked = a.hidden === true && !unlocked;
    return `<div class="achievement-item ${unlocked ? "unlocked" : "locked"}">
      <span class="achievement-name">${masked ? "???" : a.name}</span>
      <span class="achievement-desc">${masked ? "???" : a.desc}</span>
    </div>`;
  }).join("");
}

// ---- render: stats ----

let lastStatsSig = "";

function renderStats(s: GameState): void {
  const clicksDisplay = s.stats.clicks.toLocaleString("en-US");
  const baramiDisplay = formatBoon(s.barami);
  const livesDisplay = String(s.lives - 1);
  const allTimeBoonDisplay = formatBoon(s.allTimeBoon);
  const mediaTaxDisplay = formatBoon(s.stats.mediaTaxPaid);
  const sig = `${clicksDisplay}|${baramiDisplay}|${livesDisplay}|${allTimeBoonDisplay}|${mediaTaxDisplay}`;
  if (sig === lastStatsSig) return;
  lastStatsSig = sig;
  statsBlock.innerHTML = `
    <div class="stat-row"><span>คลิกทั้งหมด</span><span>${clicksDisplay}</span></div>
    <div class="stat-row"><span>บารมี</span><span>${baramiDisplay}</span></div>
    <div class="stat-row"><span>เวียนว่ายมาแล้ว</span><span>${livesDisplay} ครั้ง</span></div>
    <div class="stat-row"><span>บุญสะสมทั้งหมด</span><span>${allTimeBoonDisplay}</span></div>
    <div class="stat-row"><span>ภาษีสื่อที่จ่ายไป</span><span>${mediaTaxDisplay}</span></div>
  `;
}

// ---- new-unit toast ----

let lastUnit: string | null = null;

function checkUnitMilestone(s: GameState): void {
  const cur = unitFor(s.boon);
  if (cur !== lastUnit) {
    if (cur !== null) showToast(UNIT_TOASTS[cur] ?? `ท่านถึงหน่วย ${cur} แล้ว!`);
    lastUnit = cur;
  }
}

// ---- public API ----

export function renderAll(s: GameState, now: number): void {
  renderBalance(s, now);
  renderBuffPill(s, now);
  renderClickTier(s);
  renderProducers(s);
  renderUpgrades(s);
  renderPrestigeNirvana(s);
  renderAchievements(s);
  renderStats(s);
  checkUnitMilestone(s);
}

export function bindUI(s: GameState): void {
  clickable.addEventListener("click", () => {
    initAudio();
    const gained = click(s);
    playSfx(CLICK_TIERS[s.clickTier]!.sfx);
    spawnFloat(gained);
    shake();
  });

  tabs.forEach(tab => tab.addEventListener("click", () => {
    const panel = tab.dataset.panel;
    if (panel) switchTab(panel);
  }));

  const updateMuteBtn = () => {
    muteBtn.textContent = isMuted() ? "🔕" : "🔔";
    muteBtn.setAttribute("aria-label", isMuted() ? "เปิดเสียง" : "ปิดเสียง");
  };
  updateMuteBtn();
  muteBtn.addEventListener("click", () => { setMuted(!isMuted()); updateMuteBtn(); });

  const showBreakdown = () => showToast(fullBreakdown(s.boon));
  boonDisplay.addEventListener("click", showBreakdown);
  boonDisplay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showBreakdown(); }
  });

  panelServices.addEventListener("click", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLButtonElement>(".service-row[data-i]");
    if (!row?.dataset.i) return;
    buyProducer(s, Number(row.dataset.i));
  });

  panelUpgrades.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const tierRow = target.closest<HTMLButtonElement>(".upgrade-row[data-clicktier]");
    if (tierRow?.dataset.clicktier) {
      const tier = Number(tierRow.dataset.clicktier);
      if (buyClickTier(s, tier)) playSfx(CLICK_TIERS[tier]!.sfx);
      return;
    }
    const row = target.closest<HTMLButtonElement>(".upgrade-row[data-id]");
    if (!row?.dataset.id) return;
    const u = UPGRADES.find(x => x.id === row.dataset.id);
    if (u && buyUpgrade(s, row.dataset.id)) {
      playSfx("coin");
      showToast(u.flavor);
    }
  });

  clickTierBuyBtn.addEventListener("click", () => buyClickTier(s, s.clickTier + 1));

  prestigeBtn.addEventListener("click", () => {
    openConfirm(
      "สิ้นอายุขัย",
      `รีเซ็ตความก้าวหน้าปัจจุบัน แลกด้วยบารมี +${baramiGain(s)} (ภพจะเปลี่ยนตามบารมีสะสม)`,
      () => { prestige(s); save(s); },
    );
  });
  nirvanaBtn.addEventListener("click", () => {
    openConfirm(
      "นิพพาน",
      "จบเส้นทางแห่งบุญอย่างสมบูรณ์ — ยืนยันหรือไม่?",
      () => { nirvana(s); save(s); },
    );
  });

  lastUnit = unitFor(s.boon);
  checkAchievements(s);
  setInterval(() => checkAchievements(s), 1000);
}
