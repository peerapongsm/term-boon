// Game data tables and tuning constants for เติมบุญ idle clicker

export interface Producer {
  name: string;
  baseCost: number;
  baseRate: number;
  flavor: string;
}

export type UpgradeEffect =
  | { kind: "prod"; target: number | "all"; mult: number }
  | { kind: "click"; mult: number }
  | { kind: "buffDur"; mult: number }
  | { kind: "offlineCap"; addHours: number };

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
  effect: { clickMult?: number; allMult?: number; taxRate?: number };
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
}

export const PRODUCERS: Producer[] = [
  { name: "ใส่บาตรตอนเช้า", baseCost: 15, baseRate: 0.1, flavor: "ตื่นหกโมงเช้าเพื่อสิ่งนี้" },
  { name: "ตู้บริจาคอัจฉริยะ", baseCost: 60, baseRate: 0.675, flavor: "รับเหรียญอัตโนมัติ ไม่ต้องหยอดเอง" },
  { name: "ปล่อยนกปล่อยปลา", baseCost: 240, baseRate: 3.375, flavor: "นกถูกจับมาให้ท่านปล่อย — วงจรบุญสมบูรณ์แบบ" },
  { name: "โรงทาน", baseCost: 960, baseRate: 16.875, flavor: "ข้าวแกงฟรี บุญไม่ฟรี" },
  { name: "ผ้าป่า-กฐินสามัคคี", baseCost: 3_840, baseRate: 84.375, flavor: "สามัคคีคือพลัง (ของยอดบริจาค)" },
  { name: "เสาไฟพญานาค", baseCost: 15_360, baseRate: 421.875, flavor: "ยิ่งเกล็ดละเอียด บุญยิ่งแรง" },
  { name: "วัดออนไลน์ สแกน QR", baseCost: 61_440, baseRate: 2_109.375, flavor: "ทำบุญได้ทุกที่ ยกเว้นที่วัด" },
  { name: "บุญ Delivery", baseCost: 1.536e6, baseRate: 42_187.5, flavor: "สังฆทานถึงวัดใน 15 นาที ไม่ทันรับบุญคืนฟรี" },
  { name: "BunCoin Mining Rig", baseCost: 2.2e6, baseRate: 70_000, flavor: "proof-of-merit consensus" },
  { name: "ดาวเทียมกระจายบุญ THEOS-บุญ", baseCost: 3.2e6, baseRate: 110_000, flavor: "ครอบคลุมทุกพื้นที่ ไม่มีจุดอับบุญ" },
  { name: "ประตูมิติดาวดึงส์", baseCost: 4.6e6, baseRate: 170_000, flavor: "ฝากบุญตรงถึงสวรรค์ ไม่ผ่านตัวกลาง" },
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
];

export const UPGRADES: Upgrade[] = [...milestoneUpgrades, ...amulets];

export const REBIRTH_TIERS: RebirthTier[] = [
  { name: "หมาวัด", baramiFloor: 0 },
  { name: "มนุษย์เดินดิน", baramiFloor: 1 },
  { name: "เศรษฐีใจบุญ", baramiFloor: 25 },
  { name: "เทวดา", baramiFloor: 250 },
  { name: "พรหม", baramiFloor: 2500 },
];

export const EVENTS: GameEvent[] = [
  { id: "kathin", name: "เศรษฐีทอดกฐิน", desc: "คลิก ×777 นาน 7 วินาที!", durationSec: 7, effect: { clickMult: 777 } },
  { id: "dara", name: "ดาราแวะทำบุญ (มีกล้องตาม)", desc: "ทุกอย่าง ×2 นาน 77 วิ หักค่าออกสื่อ 7%", durationSec: 77, effect: { allMult: 2, taxRate: 0.07 } },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-click", name: "ปฐมบุญ", desc: "หยอดเหรียญแรก" },
  { id: "first-producer", name: "เริ่มกิจการ", desc: "ซื้อ producer ตัวแรก" },
  { id: "kot", name: "ถึงโกฏิ", desc: "มีบุญสะสมถึง 1 โกฏิ" },
  { id: "birds-25", name: "นักปล่อยมืออาชีพ", desc: "ปล่อยนกปล่อยปลา 25 จุด" },
  { id: "all-producers", name: "ครบวงจรบุญ", desc: "เป็นเจ้าของครบทั้ง 11 กิจการ" },
  { id: "clicks-1000", name: "นิ้วสายบุญ", desc: "คลิกครบ 1,000 ครั้ง" },
  { id: "first-prestige", name: "สิ้นชาติแรก", desc: "เวียนว่ายครั้งแรก" },
  { id: "deva", name: "เกิดเป็นเทวดา", desc: "ถึงภพเทวดา" },
  { id: "nirvana", name: "นิพพาน", desc: "จบเกม" },
  { id: "true-merit", name: "บุญที่แท้", desc: "???", hidden: true },
];

export const TUNING = {
  costGrowth: 1.15,
  prestigeUnlockBoon: 1e8,
  baramiProdBonus: 0.05,
  nirvanaBarami: 10_000,
  offlineCapHours: 8,
  eventMinGapSec: 60,
  eventMaxGapSec: 180,
  eventVisibleSec: 10,
};
