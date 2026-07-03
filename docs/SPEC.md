# เติมบุญ (term-boon) — Design Spec

**Date:** 2026-07-03 · **Status:** approved-pending-user-spec-review
**Folder:** `project-40-term-boon` · **Repo:** `term-boon` (public at deploy) · **Armory:** id = max+1 at ship

## What

Thai idle clicker game (Cookie Clicker genre) satirizing transactional merit-making
(ทำบุญหวังผล / พุทธพาณิชย์). Player clicks to earn **แต้มบุญ**, buys producers that
generate บุญ per second, escalates from ใส่บาตรหน้าบ้าน to interdimensional merit
infrastructure, reincarnates for permanent multipliers, and can ultimately end the
game by reaching **นิพพาน**.

Name: **เติมบุญ** — "top up merit" like topping up a prepaid phone. The satire is in
the title.

## Why

- Idle games ARE the merit economy: numbers go up, you feel good, the numbers mean
  nothing. The genre is the message.
- Buddhist cosmology ships real large-number vocabulary (โกฏิ … อสงไขย) and a real
  prestige loop (การเวียนว่ายตายเกิด). The theme provides mechanics for free that
  other reskins must invent.

## Core loop

1. **Click** the merit apparatus → +บุญ (with sound + coin/บาตร animation + floating
   number).
2. Spend บุญ on **producers** (บุญ/sec) and **upgrades** (multipliers).
3. Random **เจ้าภาพใหญ่** events grant temporary buffs.
4. **Prestige** ("สิ้นอายุขัย") resets progress for permanent **บารมี** multipliers
   and a higher rebirth tier.
5. **นิพพาน ending** ends the game — the only way to win is to stop.

## Click verb — evolving tiers

The clickable itself upgrades (purchased with บุญ). Each tier changes visual, sound,
and base บุญ/click. Arc runs physical → digital (satire escalation):

| Tier | Click target | Interaction |
|---|---|---|
| 1 | ตู้บริจาค | หยอดเหรียญ — "แกร๊ง!" coin drop |
| 2 | บาตร | ตักข้าวใส่บาตร (click target = บาตร, never the monk) |
| 3 | ถังสังฆทาน | ถวายถังเหลือง (stacking-thud sound) |
| 4 | ลูกนิมิต | ปิดทอง (soft foil shimmer) |
| 5 | QR มหาบุญ | สแกนโอน e-บุญ — "ติ๊ด!" PromptPay-style beep |

Rapid clicking: sound rate rises, apparatus shakes. No click-rate penalty (idle
genre convention).

## Producers (11, price scaling ×1.15 per unit owned)

1. ใส่บาตรตอนเช้า
2. ตู้บริจาคอัจฉริยะ (auto-collecting donation box — distinct from the manual click-tier box)
3. ปล่อยนกปล่อยปลา (flavor text: นกถูกจับมาให้ปล่อย — the loop is the joke)
4. โรงทาน
5. ผ้าป่า/กฐินสามัคคี
6. เสาไฟพญานาค (absurd sculpted-lamppost merit infrastructure; flavor: ยิ่งเกล็ดละเอียด บุญยิ่งแรง)
7. วัดออนไลน์ สแกน QR
8. บุญ Delivery (rider ส่งสังฆทานถึงวัดใน 15 นาที)
9. BunCoin mining rig (merit on the blockchain)
10. ดาวเทียมกระจายบุญ THEOS-บุญ
11. ประตูมิติดาวดึงส์ (direct deposit to heaven)

Exact base costs/rates tuned at build (standard idle curves: cost ≈ base ×
1.15^owned; each next producer ~8-12× previous base rate).

### Pacing targets (binding — verified by simulation test)

- First producer affordable within ~30s of clicking.
- Producer 11 (ประตูมิติ) first affordable at ~3-4h active play.
- First prestige unlock at ~45-60 min cumulative (first life deliberately short).
- นิพพาน reachable in ~1-2 weeks casual play (2-3 sessions/day).

A **greedy-bot simulation test** runs the engine headless (fast-forwarded ticks,
always buys best value, clicks at a fixed human-plausible rate) and asserts each
milestone lands inside its window. Curve changes that break pacing fail CI.

## Upgrades (~44, all table-driven)

Three layers, every upgrade a data-table row; engine exposes only 4 effect hooks
(producer multiplier / click multiplier / buff duration / offline cap):

1. **Per-producer milestones** (~33): own 10/25/50 of a producer → unlock a ×2
   upgrade for it. Each has its own joke name/flavor (e.g. โรงทาน lv2 = "เมนูมีเป๊ปซี่").
2. **Click-tier upgrades** (5): the evolving click verb tiers above.
3. **เครื่องรางมงคล** (~6): global multipliers + special effects (e.g. ตะกรุด =
   เจ้าภาพใหญ่ buffs last longer, สร้อยหลวงตา = offline cap +4h). สายมู jokes.

## Events — เจ้าภาพใหญ่ (golden cookie)

Spawn randomly every 60–180s, visible ~10s, click to trigger:
- **เศรษฐีทอดกฐิน**: click income ×777 for 7s.
- **ดาราแวะทำบุญ (มีกล้องตาม)**: all income ×2 for 77s, minus 7% "ค่าออกสื่อ" —
  the deduction is displayed.
More event types can be added at build if cheap; these two are the v1 floor.

## Prestige — วัฏสงสาร

- Button **"สิ้นอายุขัย"** unlocks at a บุญ threshold. Reset: บุญ, producers,
  upgrades, click tier. Keep: บารมี, achievements, statistics.
- บารมี gained scales with total บุญ earned that life (sqrt-style curve, tuned at
  build). Each บารมี point = permanent % production bonus.
- **Rebirth ladder** (badge + flavor text on each rebirth):
  หมาวัด → มนุษย์เดินดิน → เศรษฐีใจบุญ → เทวดา → พรหม.
- **นิพพาน ending**: available at max rebirth tier + บารมี threshold. Choosing it
  shows a **confirm dialog written straight, no jokes** (the one serious moment:
  states clearly the game ends and the ending screen is permanent). On confirm:
  all numbers and UI fade out → calm empty screen → lifetime statistics across all
  วัฏสงสาร → closing line.
- **Save is never actually destroyed**: นิพพาน sets `completed: true`; บารมี,
  achievements, and statistics are all preserved. A quiet "เกิดใหม่อีกครั้ง"
  button in a screen corner re-enters play as NG+ (keeps บารมี).
- Hidden achievement **"บุญที่แท้"**: return after >24h away.

## Numbers — Pali units (the wow detail)

Display formatting uses the real Buddhist numeral ladder: หมื่น แสน ล้าน →
**โกฏิ** (10⁷) → ปโกฏิ → โกฏิปโกฏิ → นหุต → นินนหุต → … → **อสงไขย** (~10¹⁴⁰).
- Transcribe the full canonical table with citation at build (data-verify task —
  primary source: Pali dictionaries / อภิธานัปปทีปิกา-derived tables; cite in
  /about). No fabricated unit names: if a rung cannot be sourced, skip to the next
  sourced rung.
- Storage: plain JS `number` (double). อสงไขย 10¹⁴⁰ ≪ 1e308, no BigInt needed.
  นิพพาน ending caps progression far below overflow.
- **Display format:** Arabic digits + Thai/Pali unit names, 3 significant digits
  (`4.20 โกฏิ`); below ล้าน plain comma grouping (`12,345 บุญ`). No Thai numerals
  (๑๒๓).
- **Unit literacy is a feature:** hover/tap a number → tooltip with the full
  figure + the unit ladder ("1 โกฏิ = 10 ล้าน"). First time a new unit is reached
  → small toast announcement ("ท่านถึงหน่วย โกฏิ แล้ว — สิบล้านบุญ!").

## Satire guardrails (binding)

- Target = the merit **economy** and merit-for-reward mindset, never the faith,
  the teachings, or practitioners' sincerity.
- No named real persons, monks, temples, or municipalities. Generic phenomena are
  OK even when they evoke news stories (e.g. sculpted lampposts) — the joke must
  never point at an identifiable party. No state/royal symbols (e.g. ครุฑ). No
  Buddha images as click targets — clicks land on objects (ตู้, บาตร, ถัง,
  ลูกนิมิต, QR).
- Jokes punch at the **transaction** side (donor hoping for returns, merit
  infrastructure absurdity), not at the doctrine. นิพพาน ending is the one moment
  played straight — it is the most doctrinally respectful beat in the game.
- `/about` page: intent statement + Pali unit sources.

## Tech

- **Stack:** Vite + TypeScript + vitest (sibling-proven versions), plain DOM, no
  framework. GitHub Pages via workflow (build_type=workflow + branch policy `main`
  immediately after enabling Pages).
- **Architecture:**
  - `lib/engine.ts` — pure game logic: tick(dt), buy, canBuy, prestige math,
    นิพพาน conditions. No DOM. Fully unit-tested.
  - `lib/units.ts` — Pali number formatting. Table-driven, tested against sourced
    values.
  - `lib/save.ts` — versioned save schema, localStorage, offline progress
    (capped, e.g. max 8h; message: "ระหว่างที่ท่านจากไป ตู้บริจาครับไป X บุญ").
    Validate loaded numbers (finite, bounds) — JSON.parse("1e999")=Infinity lesson.
  - `lib/audio.ts` — Web Audio synthesized SFX (coin, rice, thud, shimmer, beep,
    bell for events). No audio assets. Muted until first gesture; mute toggle.
  - UI layer thin over engine; rAF loop drives tick + render.
- **Design direction — «บุญWallet» merit-superapp parody:** the entire UI is
  styled as a mobile e-wallet/banking app. บุญ balance = account balance, producer
  shop = "บริการ" grid, เจ้าภาพใหญ่ = push-notification banner, prestige = "ปิด
  บัญชี". Mobile layout = banking app; desktop = web-banking portal (two genuinely
  separate layouts falls out naturally). Warm temple accents (gold/red/orange) in
  the content and illustrations so it never goes sterile. frontend-design pass +
  controller screenshot review, 2 viewports. Revamp-v2 rules apply (main area
  distinct from page bg, no orphan words). Thai-first copy.
  `prefers-reduced-motion` respected (no shake/float anims).
- **Analytics:** Umami snippet in `<head>` per armory ritual. Track only major
  events: `first_prestige`, `nirvana`.
- **Domain:** `term-boon.peerapongsm.dev` (CNAME + Pages cname, per migration
  pattern).

## Testing

- Engine: purchase math, cost curves, tick accumulation, prestige บารมี formula,
  นิพพาน gate, offline progress cap, save round-trip + version migration +
  hostile-save validation.
- Units: format table spot-checks against sourced values, boundary rungs.
- Visual: controller screenshot review both viewports (tests green ≠ สวย).

## Not in v1 (YAGNI)

Big achievement set (~10 incl. hidden is the cap), minigames, leaderboard, cloud
save, EN localization, ใส่บาตร-timing minigame, seasonal events.

## Ship ritual

Armory entry (read live by SLUG, id=max+1), root projects.json update, Umami,
live verify. Project not done until armory updated.
