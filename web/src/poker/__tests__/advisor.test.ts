import { describe, expect, it } from "vitest";
import { advise, Action } from "../advisor";
import { cardFromCode } from "../card";

const cards = (...codes: string[]) => codes.map(cardFromCode);

describe("Advisor", () => {
  it("nut hand on river with a bet facing us recommends all-in", () => {
    const advice = advise(cards("As", "Ks"), cards("2s", "7s", "9s", "3d", "4h"), 100, 20, 500);
    expect(advice.action).toBe(Action.ALL_IN);
  });

  it("trash hand facing a big river bet recommends fold", () => {
    const advice = advise(cards("2c", "7d"), cards("As", "Ks", "Qs", "Js", "10h"), 100, 200, 500);
    expect(advice.action).toBe(Action.FOLD);
  });

  it("nothing to call with strong equity suggests betting", () => {
    const advice = advise(cards("As", "Ks"), cards("2s", "7s", "9s", "3d", "4h"), 100, 0, 500);
    expect(advice.action).toBe(Action.RAISE);
  });

  it("close decision with cheap call favors calling over folding", () => {
    const advice = advise(cards("9h", "9d"), cards("2s", "6d", "Jc"), 200, 10, 500);
    expect([Action.CALL, Action.RAISE, Action.ALL_IN]).toContain(advice.action);
  });
});
