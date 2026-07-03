import { describe, it, expect } from "vitest";
import { playSfx, setMuted, isMuted } from "../src/lib/audio";

describe("audio", () => {
  it("does not throw without AudioContext (jsdom has none)", () => {
    expect(() => playSfx("coin")).not.toThrow();
  });
  it("mute state persists", () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem("term-boon-muted")).toBe("1");
  });
});
