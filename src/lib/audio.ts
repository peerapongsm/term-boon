let ctx: AudioContext | null = null;
let muted = localStorage.getItem("term-boon-muted") === "1";

export function initAudio(): void {
  if (!ctx && typeof AudioContext !== "undefined") ctx = new AudioContext();
  ctx?.resume();
}
export const setMuted = (m: boolean) => {
  muted = m;
  localStorage.setItem("term-boon-muted", m ? "1" : "0");
};
export const isMuted = () => muted;

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain = 0.15,
  delay = 0,
  slideTo?: number
) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur);
}
function noise(dur: number, gain = 0.08, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++)
    d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(ctx.destination);
  src.start(t0);
}

const RECIPES: Record<
  "coin" | "rice" | "thud" | "shimmer" | "beep" | "bell",
  () => void
> = {
  coin: () => {
    tone(2200, 0.08, "square", 0.1);
    tone(2800, 0.15, "square", 0.08, 0.03);
  },
  rice: () => noise(0.12, 0.1),
  thud: () => tone(120, 0.18, "sine", 0.3, 0, 60),
  shimmer: () => {
    for (let i = 0; i < 4; i++)
      tone(3000 + i * 400, 0.3, "sine", 0.04, i * 0.05);
  },
  beep: () => {
    tone(1568, 0.09, "sine", 0.15);
    tone(2093, 0.12, "sine", 0.15, 0.1);
  },
  bell: () => {
    tone(660, 1.2, "sine", 0.2);
    tone(1320, 0.9, "sine", 0.08);
  },
};

export function playSfx(name: keyof typeof RECIPES): void {
  if (muted || !ctx) return;
  RECIPES[name]();
}
