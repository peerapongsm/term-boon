// Pali numeral ladder. Sources (verified 2026-07-03):
//   [1] Thai Wikipedia, "อสงไขย" — https://th.wikipedia.org/wiki/อสงไขย
//       (checked against the article's raw wikitext table, which lists all
//       20 rungs from โกฏิ=10^7 to อสงไขย=10^140).
//   [2] Ānandajoti Bhikkhu, "Pāḷi Numbers (Saṅkhyā)", Ancient Buddhist Texts,
//       Dec 2016 — https://ancient-buddhist-texts.net/Textual-Studies/Grammar/Pali-Numbers.htm
//       (Pali-form grammar reference; corroborates the same 20 powers of ten
//       and the ปทุมะ-before-ปุณฑริกะ ordering at 10^112 / 10^119).
//
// Spelling notes: source [1] uses simplified Thai-rendered spellings
// (single consonants, no ั mark) for several rungs; other circulating Thai
// texts (incl. Pali-grammar transliterations) spell these with doubled
// consonants — อัพพุทะ/นิรัพพุทะ/อุปปละ/กุมุทะ/กถานะ/มหากถานะ/อักโขภินี
// instead of อพุทะ/นิระพุทะ/อุปละ/กมุทะ/อกถาน/มหากถาน/อักโขเภนี. Per the
// data-verify rule, the Thai-rendered form from source [1] is used below.
//
// NOTE: rungs 10^70/10^77 (อหหะ/อพพะ) corroborated by source [1] only; source [2] uses different names (atataṁ/apapaṁ) for the same positions.
export const UNITS: ReadonlyArray<{ pow: number; name: string }> = [
  { pow: 7, name: "โกฏิ" }, { pow: 14, name: "ปโกฏิ" }, { pow: 21, name: "โกฏิปโกฏิ" },
  { pow: 28, name: "นหุต" }, { pow: 35, name: "นินนหุต" }, { pow: 42, name: "อักโขเภนี" },
  { pow: 49, name: "พินทุ" }, { pow: 56, name: "อพุทะ" }, { pow: 63, name: "นิระพุทะ" },
  { pow: 70, name: "อหหะ" }, { pow: 77, name: "อพพะ" }, { pow: 84, name: "อฏฏะ" },
  { pow: 91, name: "โสคันธิกะ" }, { pow: 98, name: "อุปละ" }, { pow: 105, name: "กมุทะ" },
  { pow: 112, name: "ปทุมะ" }, { pow: 119, name: "ปุณฑริกะ" }, { pow: 126, name: "อกถาน" },
  { pow: 133, name: "มหากถาน" }, { pow: 140, name: "อสงไขย" },
];

const group = (n: number) => Math.floor(n).toLocaleString("en-US");

export function unitFor(n: number): string | null {
  let hit: { pow: number; name: string } | null = null;
  for (const u of UNITS) if (n >= 10 ** u.pow) hit = u; else break;
  return hit?.name ?? null;
}

export function formatBoon(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 1e7) return group(n);
  let unit = UNITS[0]!;
  for (const u of UNITS) if (n >= 10 ** u.pow) unit = u; else break;
  const mult = n / 10 ** unit.pow;
  if (mult >= 1000) return `${group(mult)} ${unit.name}`;
  if (mult >= 100) return `${mult.toFixed(0)} ${unit.name}`;
  if (mult >= 10) return `${mult.toFixed(1)} ${unit.name}`;
  return `${mult.toFixed(2)} ${unit.name}`;
}

export function fullBreakdown(n: number): string {
  const u = unitFor(n);
  const full = n < 1e21 ? group(n) : n.toExponential(2);
  return u ? `${full} บุญ · 1 ${u} = 10^${UNITS.find(x => x.name === u)!.pow}` : `${full} บุญ`;
}
