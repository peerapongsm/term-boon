import {
  GameState, click, buyProducer, buyClickTier, buyUpgrade, availableUpgrades,
  boonPerSecond, producerCost, canPrestige, baramiGain, prestige, rebirthTier,
  canNirvana, nirvana, reenter, creditTarget, auditTaxRate,
  prestigeBlockedByCredit, rebirthTierIndex, adReady, watchAd, takeLoan,
} from "./lib/engine";
import { PRODUCERS, CLICK_TIERS, UPGRADES, REBIRTH_TIERS, ACHIEVEMENTS, EVENTS, TUNING, GameEvent, AD_COPY } from "./lib/data";
import { formatBoon, fullBreakdown, unitFor } from "./lib/units";
import { initAudio, playSfx, setMuted, isMuted } from "./lib/audio";
import { save } from "./lib/save";
import { spriteURL } from "./sprites";

// Umami snippet is installed in Task 14; guard every call so this file is
// inert until then.
declare const umami: { track: (name: string) => void } | undefined;

// ---- DOM refs (cached once at module init; DOM is already parsed since
// main.ts is a module script placed at end of <body>) ----
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const appRoot = $<HTMLElement>("app");
const boonDisplay = $<HTMLElement>("boon-display");
const bpsDisplay = $<HTMLElement>("bps-display");
const rebirthBadge = $<HTMLElement>("rebirth-badge");
const creditValue = $<HTMLElement>("credit-value");
const creditFill = $<HTMLElement>("credit-fill");
const creditGateHint = $<HTMLElement>("credit-gate-hint");
const muteBtn = $<HTMLButtonElement>("mute-btn");
const eventBanner = $<HTMLElement>("event-banner");
const eventClaim = $<HTMLButtonElement>("event-claim");
const clickable = $<HTMLButtonElement>("clickable");
const clickTierArt = $<HTMLElement>("click-tier-art");
const clickTierName = $<HTMLElement>("click-tier-name");
const floatLayer = $<HTMLElement>("float-layer");
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".tab"));
const panelServices = $<HTMLElement>("panel-services");
const panelUpgrades = $<HTMLElement>("panel-upgrades");
const panelProfile = $<HTMLElement>("panel-profile");
const achievementsList = $<HTMLElement>("achievements-list");
const statsBlock = $<HTMLElement>("stats-block");
const prestigeBtn = $<HTMLButtonElement>("prestige-btn");
const nirvanaBtn = $<HTMLButtonElement>("nirvana-btn");
const watchAdBtn = $<HTMLButtonElement>("watch-ad-btn");
const loanBtn = $<HTMLButtonElement>("loan-btn");
const loanStatus = $<HTMLElement>("loan-status");
const adDialog = $<HTMLDialogElement>("ad-dialog");
const toastLayer = $<HTMLElement>("toast-layer");
const confirmDialog = $<HTMLDialogElement>("confirm-dialog");
const endingScreen = $<HTMLElement>("ending-screen");

// rebirth interstitial: no dedicated element in index.html, created once
// here and appended to <body>, same pattern as the buff pill layer below.
const rebirthOverlay = document.createElement("div");
rebirthOverlay.id = "rebirth-overlay";
rebirthOverlay.className = "rebirth-overlay";
rebirthOverlay.hidden = true;
document.body.appendChild(rebirthOverlay);

// buff countdown pill layer: no dedicated element in index.html (Task 12 is
// ui.ts/style.css-only), so it's created once here and appended to the
// balance card, same pattern as other dynamically-built content in this file.
const balanceCard = document.querySelector<HTMLElement>(".balance-card")!;
const buffPillLayer = document.createElement("div");
buffPillLayer.id = "buff-pills";
buffPillLayer.className = "buff-pills";
balanceCard.appendChild(buffPillLayer);

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
  // keyed by endsAt (not eventId) so two stacked buffs of the same event
  // (e.g. dara re-triggered while a ตะกรุด-extended one is still running)
  // each get their own pill instead of colliding on one shared countdown.
  const sig = active.map(b => `${b.eventId}:${b.endsAt}`).join(",");
  if (sig !== lastBuffSig) {
    lastBuffSig = sig;
    buffPillLayer.innerHTML = active
      .map(b => `<span class="buff-pill" data-event="${b.eventId}" data-ends="${b.endsAt}"></span>`)
      .join("");
  }

  const hasDara = active.some(b => b.eventId === "dara");
  if (hasDara && daraTaxSnapshot === null) daraTaxSnapshot = s.stats.mediaTaxPaid;
  if (!hasDara) daraTaxSnapshot = null;

  buffPillLayer.querySelectorAll<HTMLElement>(".buff-pill").forEach(pill => {
    const endsAt = Number(pill.dataset.ends);
    const b = active.find(x => x.eventId === pill.dataset.event && x.endsAt === endsAt);
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
  const araIdx = REBIRTH_TIERS.findIndex(t => t.name === "อรหันต์");
  if (araIdx !== -1 && REBIRTH_TIERS.findIndex(t => t.name === rebirthTier(s).name) >= araIdx)
    unlockAchievement(s, "arahant");
  if (s.samsara >= 10) unlockAchievement(s, "samsara-10");
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

// ---- confirm dialog ----

function openConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  opts: { cancelLabel?: string } = {},
): void {
  confirmDialog.innerHTML = "";
  const form = document.createElement("form");
  form.method = "dialog";
  form.className = "confirm-form";
  const h3 = document.createElement("h3");
  h3.textContent = title;
  const body = document.createElement("div");
  message.split("\n").forEach(line => {
    const p = document.createElement("p");
    p.textContent = line;
    body.appendChild(p);
  });
  const actions = document.createElement("div");
  actions.className = "confirm-actions";
  const cancelBtn = document.createElement("button");
  cancelBtn.value = "cancel";
  cancelBtn.className = "secondary-btn";
  cancelBtn.textContent = opts.cancelLabel ?? "ยกเลิก";
  const confirmBtn = document.createElement("button");
  confirmBtn.value = "confirm";
  confirmBtn.className = "danger-btn";
  confirmBtn.textContent = "ยืนยัน";
  actions.append(cancelBtn, confirmBtn);
  form.append(h3, body, actions);
  confirmDialog.appendChild(form);
  confirmDialog.showModal();
  confirmDialog.addEventListener("close", function handler() {
    if (confirmDialog.returnValue === "confirm") onConfirm();
    confirmDialog.removeEventListener("close", handler);
  });
}

// ---- fake rewarded ad (โฆษณาบุญ) ----

function openAd(s: GameState): void {
  const copy = AD_COPY[Math.floor(Math.random() * AD_COPY.length)]!;
  let left = reducedMotion() ? 0 : 15;
  const render = (canSkip: boolean) => {
    adDialog.innerHTML = `
      <div class="ad-inner">
        <div class="ad-sponsor">ผู้สนับสนุน · บุญWallet Ads</div>
        <div class="ad-banner">${copy}</div>
        <div class="ad-fineprint">*เงื่อนไขเป็นไปตามที่กรรมกำหนด</div>
        <div class="ad-controls">
          <span class="ad-count">${canSkip ? "" : `ข้ามได้ใน ${left} วิ`}</span>
          ${canSkip ? `
            <button class="ad-reward" data-r="buff">บุญคูณ ×2 (90 วิ)</button>
            <button class="ad-reward" data-r="lump">บุญด่วนก้อนโต</button>
            <button class="ad-reward" data-r="credit">เครดิต +20</button>
            <button class="ad-close" value="cancel">✕ ปิด</button>` : ""}
        </div>
      </div>`;
  };
  initAudio(); playSfx("jingle");
  render(left <= 0);
  if (!adDialog.open) adDialog.showModal();
  const timer = setInterval(() => {
    left--;
    if (left <= 0) { clearInterval(timer); render(true); } else render(false);
  }, 1000);
  adDialog.onclose = () => { clearInterval(timer); adDialog.onclick = null; adDialog.onclose = null; };
  adDialog.onclick = (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(".ad-reward");
    if (btn?.dataset.r) {
      watchAd(s, btn.dataset.r as "buff" | "lump" | "credit");
      save(s);
      clearInterval(timer); adDialog.close(); adDialog.onclick = null;
    } else if ((e.target as HTMLElement).classList.contains("ad-close")) {
      clearInterval(timer); adDialog.close(); adDialog.onclick = null;
    }
  };
}

// ---- render: balance / rebirth ----

function renderBalance(s: GameState, now: number): void {
  boonDisplay.textContent = formatBoon(s.boon);
  bpsDisplay.textContent = `+${formatBoon(boonPerSecond(s, now))} บุญ/วิ`;
  rebirthBadge.textContent = `ภพ: ${rebirthTier(s).name}`;
  const serial = `ชาติที่ ${s.lives}`;
  if (balanceCard.dataset.serial !== serial) balanceCard.dataset.serial = serial;
}

function renderCredit(s: GameState): void {
  creditValue.textContent = String(Math.round(s.credit));
  const pct = ((s.credit - 300) / (900 - 300)) * 100;
  creditFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  creditFill.dataset.band = s.credit >= 750 ? "good" : s.credit >= 500 ? "mid" : "bad";
}

// ---- render: click tier ----

function renderClickTier(s: GameState): void {
  clickTierName.textContent = CLICK_TIERS[s.clickTier]!.name;
  if (clickTierArt.dataset.tier !== String(s.clickTier) || !clickTierArt.firstChild) {
    clickTierArt.dataset.tier = String(s.clickTier);
    clickTierArt.innerHTML = `<img class="pix pix-click" src="${spriteURL(`tier-${s.clickTier}`)}" alt="">`;
  }
  // click-tier purchase is done from the upgrades panel's click-tier-row
  // (the canonical purchase surface); this only renders the click button art.
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
          <img class="pix pix-icon" src="${spriteURL(`p${i}`)}" alt="">
          <span class="service-name">???</span>
          <span class="service-cost">???</span>
        </div>`;
      }
      const owned = s.producers[i] ?? 0;
      const cost = producerCost(i, owned);
      return `<button class="service-row" data-i="${i}">
        <img class="pix pix-icon" src="${spriteURL(`p${i}`)}" alt="">
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
    panelUpgrades.innerHTML = (tierRowHtml + upgradeRowsHtml) ||
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
  const canP = canPrestige(s);
  const blocked = prestigeBlockedByCredit(s);
  prestigeBtn.hidden = !canP;
  prestigeBtn.disabled = blocked;
  prestigeBtn.textContent = canP
    ? `สิ้นอายุขัย (บารมี +${baramiGain(s)})`
    : "สิ้นอายุขัย";
  if (canP && blocked) {
    creditGateHint.hidden = false;
    creditGateHint.textContent =
      `เครดิตต่ำ (${Math.round(s.credit)}) — รัวคลิกศรัทธา / ดูโฆษณาบุญ ดันเครดิต ≥ 500 ก่อนเกิดใหม่ ถึงจะขึ้นเทวดาได้`;
  } else {
    creditGateHint.hidden = true;
  }
  nirvanaBtn.hidden = !canNirvana(s);
}

// ---- rebirth interstitial (full-screen fade-to-white on prestige) ----

const REBIRTH_FLAVOR: Record<string, string> = {
  "หมาวัด": "ชาตินี้เกิดเป็นหมาวัด — อย่างน้อยก็ได้อยู่ใกล้บุญ",
  "มนุษย์เดินดิน": "ชาตินี้เกิดเป็นมนุษย์เดินดิน — เวียนว่ายต่อไปอย่างสามัญ เริ่มทำบุญกันใหม่",
  "เศรษฐีใจบุญ": "ชาตินี้เกิดเป็นเศรษฐีใจบุญ — มีทุนทำบุญไม่ขาดมือ แต่บุญก็ยังไม่เคยพอ",
  "เทพบุตร-เทพธิดา": "ชาตินี้เกิดเป็นเทพบุตร-เทพธิดา — ก้าวพ้นความเป็นมนุษย์มาได้หนึ่งขั้น",
  "เทวดา": "ชาตินี้เกิดเป็นเทวดา — ได้พักในภพที่สุขสบายขึ้นอีกหน่อย",
  "พรหม": "ชาตินี้เกิดเป็นพรหม — ใกล้ปลายทางแล้ว แต่ก็ยังต้องเวียนว่ายต่อไป",
  "อรหันต์": "ชาตินี้ใกล้ที่สุดแล้ว — เหลือเพียงก้าวเดียวสู่นิพพาน",
};

function showRebirthInterstitial(s: GameState): void {
  const tier = rebirthTier(s);
  rebirthOverlay.innerHTML = `
    <div class="rebirth-content">
      <div class="rebirth-tier-name">${tier.name}</div>
      <div class="rebirth-flavor">${REBIRTH_FLAVOR[tier.name] ?? ""}</div>
    </div>
  `;
  rebirthOverlay.classList.remove("visible", "fade-out");
  rebirthOverlay.hidden = false;
  requestAnimationFrame(() => rebirthOverlay.classList.add("visible"));
  setTimeout(() => {
    rebirthOverlay.classList.remove("visible");
    rebirthOverlay.classList.add("fade-out");
    setTimeout(() => { rebirthOverlay.hidden = true; }, 500);
  }, 2400);
}

// ---- นิพพาน ending screen ----

function renderEnding(s: GameState): void {
  endingScreen.innerHTML = `
    <div class="ending-content">
      <div class="ending-stats">
        <div class="stat-row"><span>เวียนว่ายมาแล้ว</span><span>${s.lives - 1} ครั้ง</span></div>
        <div class="stat-row"><span>รอบสังสารวัฏ (หลังนิพพาน)</span><span>${s.samsara}</span></div>
        <div class="stat-row"><span>บุญสะสมทั้งหมด</span><span>${formatBoon(s.allTimeBoon)}</span></div>
        <div class="stat-row"><span>คลิกทั้งหมด</span><span>${s.stats.clicks.toLocaleString("en-US")}</span></div>
      </div>
      <p class="ending-line">บุญที่แท้ ไม่เคยต้องนับ</p>
      <div class="ending-actions">
        <button id="dissolve-btn" class="secondary-btn">ดับสูญ (จบเกม)</button>
        <button id="reenter-btn" class="reenter-btn">เวียนว่ายต่อ (เก็บบารมี)</button>
      </div>
    </div>`;
  $<HTMLButtonElement>("reenter-btn").addEventListener("click", () => {
    reenter(s); save(s); location.reload();
  });
  $<HTMLButtonElement>("dissolve-btn").addEventListener("click", () => {
    $<HTMLElement>("ending-screen").querySelector<HTMLElement>(".ending-actions")!.hidden = true;
  });
}

function showEndingNow(s: GameState): void {
  appRoot.hidden = true;
  appRoot.setAttribute("inert", "");
  renderEnding(s);
  endingScreen.hidden = false;
}

function startNirvanaEnding(s: GameState): void {
  appRoot.classList.add("app-ending");
  const delay = reducedMotion() ? 0 : 4000;
  setTimeout(() => showEndingNow(s), delay);
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
  const creditDisplay = `${Math.round(s.credit)} (ภาษี ${Math.round(auditTaxRate(s) * 100)}%)`;
  const sig = `${clicksDisplay}|${baramiDisplay}|${livesDisplay}|${allTimeBoonDisplay}|${mediaTaxDisplay}|${creditDisplay}`;
  if (sig === lastStatsSig) return;
  lastStatsSig = sig;
  statsBlock.innerHTML = `
    <div class="stat-row"><span>คลิกทั้งหมด</span><span>${clicksDisplay}</span></div>
    <div class="stat-row"><span>บารมี</span><span>${baramiDisplay}</span></div>
    <div class="stat-row"><span>เวียนว่ายมาแล้ว</span><span>${livesDisplay} ครั้ง</span></div>
    <div class="stat-row"><span>บุญสะสมทั้งหมด</span><span>${allTimeBoonDisplay}</span></div>
    <div class="stat-row"><span>ภาษีสื่อที่จ่ายไป</span><span>${mediaTaxDisplay}</span></div>
    <div class="stat-row"><span>เครดิตบุญ</span><span>${creditDisplay}</span></div>
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
  renderCredit(s);
  renderBuffPill(s, now);
  renderClickTier(s);
  renderProducers(s);
  renderUpgrades(s);
  renderPrestigeNirvana(s);
  renderAchievements(s);
  renderStats(s);
  checkUnitMilestone(s);
  watchAdBtn.hidden = !adReady(s, now);
  loanBtn.hidden = s.completed || s.loan !== null || boonPerSecond(s, now) <= 0;
  if (s.loan) {
    loanStatus.hidden = false;
    loanStatus.textContent = `หนี้บุญคงเหลือ ${formatBoon(s.loan.remaining)} (หัก 25% ของรายได้)`;
  } else {
    loanStatus.hidden = true;
  }
}

export function bindUI(s: GameState): void {
  clickable.addEventListener("click", () => {
    if (s.completed) return;
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
    if (s.completed) return;
    const row = (e.target as HTMLElement).closest<HTMLButtonElement>(".service-row[data-i]");
    if (!row?.dataset.i) return;
    buyProducer(s, Number(row.dataset.i));
  });

  panelUpgrades.addEventListener("click", (e) => {
    if (s.completed) return;
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

  prestigeBtn.addEventListener("click", () => {
    openConfirm(
      "สิ้นอายุขัย",
      `สิ้นอายุขัยชาตินี้ — เริ่มใหม่ทั้งหมด แลกกับ บารมี +${baramiGain(s)} (ผลผลิตถาวร +5%/แต้ม)`,
      () => {
        const wasFirst = s.lives === 1;
        prestige(s);
        save(s);
        if (wasFirst && typeof umami !== "undefined") umami.track("first_prestige");
        showRebirthInterstitial(s);
      },
    );
  });
  watchAdBtn.addEventListener("click", () => { if (adReady(s)) openAd(s); });

  loanBtn.addEventListener("click", () => {
    if (s.completed || s.loan) return;
    openConfirm(
      "สินเชื่อบุญด่วน",
      "รับบุญก้อนโตทันที แลกกับเครดิตที่ลดลง\nและถูกหักบุญ 25% ของรายได้จนกว่าจะใช้หนี้หมด (ดอกเบี้ย 15%)\nกู้ไหม",
      () => { takeLoan(s); save(s); playSfx("coin"); },
      { cancelLabel: "ไม่กู้" },
    );
  });

  nirvanaBtn.addEventListener("click", () => {
    openConfirm(
      "นิพพาน",
      "การเข้าสู่นิพพานคือการจบเกมอย่างถาวร\n" +
      "ตัวเลขทั้งหมดจะหายไป และจะไม่มีอะไรให้สะสมอีก\n" +
      "ความคืบหน้าของท่านจะไม่ถูกลบ แต่หน้าจอสุดท้ายจะคงอยู่\n" +
      "ยืนยันหรือไม่",
      () => {
        nirvana(s);
        save(s);
        if (typeof umami !== "undefined") umami.track("nirvana");
        startNirvanaEnding(s);
      },
      { cancelLabel: "กลับไปสะสมต่อ" },
    );
  });

  lastUnit = unitFor(s.boon);
  checkAchievements(s);
  setInterval(() => checkAchievements(s), 1000);

  // refresh mid-ending: completed persists across reload, so re-show the
  // ending screen immediately instead of the fade sequence.
  if (s.completed) showEndingNow(s);
}
