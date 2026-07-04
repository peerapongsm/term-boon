// Game data tables and tuning constants for เติมบุญ idle clicker

export interface Producer {
  name: string;
  baseCost: number;
  baseRate: number;
  flavor: string;
  klass: "wholesome" | "neutral" | "monetize";
  creditRate: number;                 // per-owned credit pressure (informational; share math uses klass)
}

export type UpgradeEffect =
  | { kind: "prod"; target: number | "all"; mult: number }
  | { kind: "click"; mult: number }
  | { kind: "buffDur"; mult: number }
  | { kind: "offlineCap"; addHours: number }
  | { kind: "creditDrift"; add: number }
  | { kind: "auditImmune" };

export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  flavor: string;
  effect: UpgradeEffect;
  requires?: { producer: number; count: number };
}

export interface ClickTier {
  name: string;
  cost: number;
  baseClick: number;
  sfx: "coin" | "rice" | "thud" | "shimmer" | "beep";
}

export interface RebirthTier {
  name: string;
  baramiFloor: number;
}

export interface GameEvent {
  id: string;
  name: string;
  desc: string;
  durationSec: number;
  effect: { clickMult?: number; allMult?: number; taxRate?: number; creditDelta?: number };
  random?: boolean;                   // default true; false = never auto-triggered
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
}

export const PRODUCERS: Producer[] = [
  { name: "ใส่บาตรตอนเช้า", baseCost: 15, baseRate: 0.1, klass: "wholesome", creditRate: 0.4, flavor: "ตื่นหกโมงเช้าเพื่อสิ่งนี้" },
  { name: "ตู้บริจาคอัจฉริยะ", baseCost: 60, baseRate: 0.675, klass: "wholesome", creditRate: 0.2, flavor: "รับเหรียญอัตโนมัติ ไม่ต้องหยอดเอง" },
  { name: "ปล่อยนกปล่อยปลา", baseCost: 240, baseRate: 3.375, klass: "wholesome", creditRate: 0.2, flavor: "นกถูกจับมาให้ท่านปล่อย — วงจรบุญสมบูรณ์แบบ" },
  { name: "โรงทาน", baseCost: 960, baseRate: 16.875, klass: "wholesome", creditRate: 0.3, flavor: "ข้าวแกงฟรี บุญไม่ฟรี" },
  { name: "ผ้าป่า-กฐินสามัคคี", baseCost: 3_840, baseRate: 84.375, klass: "neutral", creditRate: 0, flavor: "สามัคคีคือพลัง (ของยอดบริจาค)" },
  { name: "เสาไฟพญานาค", baseCost: 15_360, baseRate: 421.875, klass: "neutral", creditRate: 0, flavor: "ยิ่งเกล็ดละเอียด บุญยิ่งแรง" },
  { name: "วัดออนไลน์ สแกน QR", baseCost: 61_440, baseRate: 2_109.375, klass: "neutral", creditRate: 0, flavor: "ทำบุญได้ทุกที่ ยกเว้นที่วัด" },
  { name: "บุญ Delivery", baseCost: 1.536e6, baseRate: 42_187.5, klass: "neutral", creditRate: 0, flavor: "สังฆทานถึงวัดใน 15 นาที ไม่ทันรับบุญคืนฟรี" },
  { name: "BunCoin Mining Rig", baseCost: 6.144e6, baseRate: 210_937.5, klass: "monetize", creditRate: -0.5, flavor: "proof-of-merit consensus" },
  { name: "ดาวเทียมกระจายบุญ THEOS-บุญ", baseCost: 2.4576e7, baseRate: 1_054_687.5, klass: "monetize", creditRate: -0.6, flavor: "ครอบคลุมทุกพื้นที่ ไม่มีจุดอับบุญ" },
  { name: "ประตูมิติดาวดึงส์", baseCost: 9.8304e7, baseRate: 5_273_437.5, klass: "monetize", creditRate: -0.7, flavor: "ฝากบุญตรงถึงสวรรค์ ไม่ผ่านตัวกลาง" },
  { name: "NFT พระเครื่อง", baseCost: 3.5e8, baseRate: 2.636719e7, klass: "monetize", creditRate: -0.8, flavor: "ของแท้ตรวจสอบได้บนบล็อกเชน (ห้ามถาม gas fee)" },
  { name: "บริษัทบุญมหาชน (IPO)", baseCost: 1.25e9, baseRate: 1.318359e8, klass: "monetize", creditRate: -0.9, flavor: "บุญเข้าตลาดหลักทรัพย์แล้ว ราคาพุ่งตามข่าว" },
  { name: "เมตาเวิร์สวัด", baseCost: 4.4e9, baseRate: 6.591797e8, klass: "monetize", creditRate: -1.0, flavor: "ทำบุญใน VR ไม่ต้องออกจากบ้าน (ขายที่ดินดิจิทัลรอบอุโบสถ)" },
];

export const CLICK_TIERS: ClickTier[] = [
  { name: "หยอดเหรียญตู้บริจาค", cost: 0, baseClick: 1, sfx: "coin" },
  { name: "ใส่บาตร", cost: 500, baseClick: 10, sfx: "rice" },
  { name: "ถวายถังสังฆทาน", cost: 50_000, baseClick: 120, sfx: "thud" },
  { name: "ปิดทองลูกนิมิต", cost: 5e6, baseClick: 1_500, sfx: "shimmer" },
  { name: "สแกน QR มหาบุญ", cost: 5e8, baseClick: 20_000, sfx: "beep" },
];

const MILESTONE_NAMES: [string, string, string][] = [
  ["ข้าวหอมมะลิใหม่", "แกงถุงเพิ่มอีกอย่าง", "ชุดใส่บาตรพรีเมียม"],
  ["ตู้สแตนเลสกันสนิม", "ตู้มีไฟ LED วิ่ง", "ตู้รับธนบัตรและเหรียญต่างประเทศ"],
  ["นกบินกลับมาให้ปล่อยซ้ำ", "เหมาโหลถูกกว่า", "ปล่อยปลามงคล 9 ชนิด"],
  ["เมนูมีเป๊ปซี่", "คิวไม่ต้องต่อ", "เชฟมิชลินมาอาสา"],
  ["ซองผ้าป่าแบบสแกนจ่าย", "ขบวนแห่กลองยาว", "กฐิน 77 จังหวัดพร้อมกัน"],
  ["เกล็ดละเอียดขึ้น", "ตาเป็น LED เปลี่ยนสีได้", "พ่นหมอกเย็นตอนสงกรานต์"],
  ["สวดมนต์สตรีมสด", "แอดมินตอบภายใน 5 นาที", "สมาชิกรายเดือน บุญ+"],
  ["ส่งฟรีไม่มีขั้นต่ำ", "ไรเดอร์ระดับเซียน", "สังฆทาน subscription รายสัปดาห์"],
  ["การ์ดจอรุ่นศรัทธา", "halving ไม่กระทบสายบุญ", "staking บุญ APY 108%"],
  ["จานรับสัญญาณบุญ", "วงโคจรค้างฟ้าเหนือวัด", "ถ่ายทอดธรรมะ 4K"],
  ["ประตูบานที่สอง", "ทางด่วนพิเศษชั้นดาวดึงส์", "วีซ่าถาวรดาวดึงส์"],
  ["mint รุ่นพิเศษ", "floor price ไม่มีวันตก", "airdrop บุญให้ holder"],
  ["ปันผลบุญรายไตรมาส", "เข้า SET100 สายบุญ", "แตกพาร์เพิ่มสภาพคล่องบุญ"],
  ["ที่ดินติดอุโบสถราคาพุ่ง", "avatar ห่มจีวร skin", "งานกฐินข้ามเซิร์ฟเวอร์"],
];
const MILESTONE_COUNTS = [10, 25, 50] as const;

const milestoneUpgrades: Upgrade[] = PRODUCERS.flatMap((p, pi) =>
  MILESTONE_COUNTS.map((count, mi) => {
    const effect: UpgradeEffect = { kind: "prod", target: pi, mult: 2 };
    return {
      id: `m${pi}-${count}`,
      name: MILESTONE_NAMES[pi]![mi]!,
      cost: p.baseCost * Math.pow(1.15, count) * 10,
      flavor: p.name,
      effect,
      requires: { producer: pi, count },
    };
  }),
);

const amulets: Upgrade[] = [
  { id: "a-takrut", name: "ตะกรุดมหาเฮง", cost: 1e6, flavor: "บุฟฟ์เจ้าภาพอยู่นานขึ้น 50%", effect: { kind: "buffDur", mult: 1.5 } },
  { id: "a-ring", name: "แหวนหัวหมุนได้", cost: 2e6, flavor: "หมุนก่อนคลิก คลิกแรงขึ้นเท่าตัว", effect: { kind: "click", mult: 2 } },
  { id: "a-yant", name: "ผ้ายันต์ติดผนังร้าน", cost: 1e7, flavor: "กิจการบุญทั้งหมด +50%", effect: { kind: "prod", target: "all", mult: 1.5 } },
  { id: "a-soi", name: "สร้อยประคำไม้หายาก", cost: 5e7, flavor: "บุญไหลแม้หลับ — offline cap +4 ชม.", effect: { kind: "offlineCap", addHours: 4 } },
  { id: "a-liam", name: "พระเลี่ยมทองรุ่นลิมิเต็ด", cost: 1e9, flavor: "ของแท้ต้องมีใบเซอร์ — ทุกอย่าง ×2", effect: { kind: "prod", target: "all", mult: 2 } },
  { id: "a-phone", name: "มือถือเปิดธรรมะ 24 ชม.", cost: 1e11, flavor: "บุญ ambient ทั้งบ้าน ×1.77", effect: { kind: "prod", target: "all", mult: 1.77 } },
  { id: "a-credit", name: "เครื่องรางเครดิตดี", cost: 5e8, flavor: "เครดิตบุญนิ่งขึ้น — ดันจุดสมดุล +100", effect: { kind: "creditDrift", add: 100 } },
  { id: "a-cert", name: "ใบเซอร์บุญแท้", cost: 5e9, flavor: "มีใบรับรอง — ภาษีตรวจสอบไม่เกิน 5%", effect: { kind: "auditImmune" } },
];

export const UPGRADES: Upgrade[] = [...milestoneUpgrades, ...amulets];

export const REBIRTH_TIERS: RebirthTier[] = [
  { name: "หมาวัด", baramiFloor: 0 },
  { name: "มนุษย์เดินดิน", baramiFloor: 1 },
  { name: "เศรษฐีใจบุญ", baramiFloor: 25 },
  { name: "เทพบุตร-เทพธิดา", baramiFloor: 2_000_000 },
  { name: "เทวดา", baramiFloor: 100_000_000 },
  { name: "พรหม", baramiFloor: 2_000_000_000 },
  { name: "อรหันต์", baramiFloor: 5_000_000_000 },
];

export const EVENTS: GameEvent[] = [
  { id: "kathin", name: "เศรษฐีทอดกฐิน", desc: "คลิก ×777 นาน 7 วินาที!", durationSec: 7, effect: { clickMult: 777 } },
  { id: "dara", name: "ดาราแวะทำบุญ (มีกล้องตาม)", desc: "ทุกอย่าง ×2 นาน 77 วิ หักค่าออกสื่อ 7%", durationSec: 77, effect: { allMult: 2, taxRate: 0.07 } },
  { id: "lotto", name: "ข่าวลือเจ้าสำนักถูกหวย", desc: "ศรัทธาแห่ — ยอดบริจาค ×3 นาน 30 วิ", durationSec: 30, effect: { allMult: 3 } },
  { id: "audit", name: "ดราม่าเงินทอน (ตรวจสอบ)", desc: "ถูกเพ่งเล็ง — ภาษี 20% นาน 40 วิ", durationSec: 40, effect: { taxRate: 0.2, creditDelta: -30 } },
  { id: "influ", name: "อินฟลูฯ สายบุญไลฟ์สด", desc: "คลิก ×50 นาน 20 วิ", durationSec: 20, effect: { clickMult: 50 } },
  { id: "tour", name: "ทัวร์ลง (คอมเมนต์ถล่ม)", desc: "เครดิตร่วง แต่คนเห็นเยอะ — ทุกอย่าง ×2 นาน 25 วิ", durationSec: 25, effect: { allMult: 2, creditDelta: -20 } },
  { id: "ufo", name: "จานบินบุญปรากฏเหนืออุโบสถ", desc: "ยานอวกาศบุญมารับศรัทธา — ทุกอย่าง ×3 นาน 30 วิ", durationSec: 30, effect: { allMult: 3 } },
  { id: "jet", name: "เจ้าสำนักเหินฟ้าเจ็ทส่วนตัว", desc: "บินไปงานบุญด้วยเจ็ทส่วนตัว — ทุกอย่าง ×2 นาน 20 วิ แต่เครดิต −25", durationSec: 20, effect: { allMult: 2, creditDelta: -25 } },
  { id: "ad-x2", name: "บุญคูณผู้สนับสนุน", desc: "ทุกอย่าง ×2 นาน 90 วิ (จากโฆษณา)", durationSec: 90, effect: { allMult: 2 }, random: false },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-click", name: "ปฐมบุญ", desc: "หยอดเหรียญแรก" },
  { id: "first-producer", name: "เริ่มกิจการ", desc: "ซื้อ producer ตัวแรก" },
  { id: "kot", name: "ถึงโกฏิ", desc: "มีบุญสะสมถึง 1 โกฏิ" },
  { id: "birds-25", name: "นักปล่อยมืออาชีพ", desc: "ปล่อยนกปล่อยปลา 25 จุด" },
  { id: "all-producers", name: "ครบวงจรบุญ", desc: "เป็นเจ้าของครบทั้ง 14 กิจการ" },
  { id: "clicks-1000", name: "นิ้วสายบุญ", desc: "คลิกครบ 1,000 ครั้ง" },
  { id: "first-prestige", name: "สิ้นชาติแรก", desc: "เวียนว่ายครั้งแรก" },
  { id: "deva", name: "เกิดเป็นเทวดา", desc: "ถึงภพเทวดา" },
  { id: "nirvana", name: "นิพพาน", desc: "จบเกม" },
  { id: "arahant", name: "ใกล้ฝั่ง", desc: "ถึงภพอรหันต์" },
  { id: "samsara-10", name: "วนซ้ำสิบรอบ", desc: "เวียนว่ายหลังนิพพาน 10 รอบ", hidden: true },
  { id: "true-merit", name: "บุญที่แท้", desc: "???", hidden: true },
];

export const AD_COPY: string[] = [
  "สินเชื่อบุญด่วน อนุมัติใน 5 นาที ไม่เช็คเครดิต*",
  "ลงทุน BunCoin วันนี้ บุญโต 108% ต่อปี**",
  "แอปสั่งสังฆทาน ลด 50% เฉพาะวันนี้",
  "คอร์สรวยบุญ 3 วันเปลี่ยนชีวิต สมัครก่อนเต็ม",
  "เครื่องรางเรียกบุญ ของแท้ 100% มีใบเซอร์",
];

export const NEWS_ECHO: string[] = [
  "ข่าวด่วน: วัดดังเปิดตัวเหรียญบุญรุ่นใหม่ คนแห่จองล้นหลาม",
  "นักวิเคราะห์ชี้ ตลาดบุญผันผวน หลังข่าวลือเจ้าสำนักถูกหวย",
  "อินฟลูฯ สายมูรีวิว 'สังฆทาน subscription' ยอดวิวทะลุล้าน",
  "ผู้เชี่ยวชาญเตือน ระวังแอปสินเชื่อบุญดอกเบี้ยโหด",
  "กระแส NFT พระเครื่องแรง ราคาพุ่งข้ามคืน",
  "เมตาเวิร์สวัดเปิดขายที่ดินดิจิทัลรอบอุโบสถ หมดใน 3 นาที",
  "วัดดังเปิดตัว 'ยานอวกาศบุญ' รับศรัทธาถึงนอกโลก คนแห่จองล้นหลาม",
  "อดีตเจ้าสำนักโพสต์รูปคู่เจ็ทส่วนตัวและกระเป๋าแบรนด์เนม ดราม่าสนั่นโซเชียล",
];

export const TUNING = {
  costGrowth: 1.15,
  prestigeUnlockBoon: 1e8,
  baramiProdBonus: 0.05,
  nirvanaBarami: 9_000_000_000,
  offlineCapHours: 8,
  eventMinGapSec: 60,
  eventMaxGapSec: 180,
  eventVisibleSec: 10,
  // ---- credit ----
  creditMin: 300,
  creditMax: 900,
  creditBaseline: 650,
  creditBaselinePerTier: 10,
  creditGateFloor: 500,               // เทวดา gate
  creditDriftPerSec: 20,
  creditShareMonetize: 400,           // subtract weight
  creditShareWholesome: 200,          // add weight
  clickCreditTrickle: 0.5,            // per click, ×combo
  auditImmuneCap: 0.05,               // ใบเซอร์บุญแท้ caps tax here
  // ---- momentum ----
  momentumPerTier: 0.1,
  // ---- loan ----
  loanSiphon: 0.25,
  loanInterest: 0.15,
  loanLumpSeconds: 450,               // principal = 450 × bps
  // ---- click combo ----
  comboWindowMs: 1500,
  comboStep: 0.02,
  comboCap: 2,                        // mult = 1 + min(count·step, cap) → ≤ ×3
  // ---- ads ----
  adCooldownSec: 300,
  adLumpSeconds: 120,                 // lump = max(120×bps, floor)
  adCreditReward: 20,
  adBuffSec: 90,
};
