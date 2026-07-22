import { describe, expect, it } from "vitest";
import { cardFromCode } from "../card";
import { equityOf, estimateEquity } from "../equity";

const cards = (...codes: string[]) => codes.map(cardFromCode);

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x80000000;
  };
}

describe("EquityCalculator", () => {
  it("pocket aces preflop is a big favorite", () => {
    const result = estimateEquity(cards("As", "Ah"), [], 6000, seededRng(42));
    const equity = equityOf(result);
    expect(equity).toBeGreaterThan(0.75);
    expect(equity).toBeLessThan(0.94);
  });

  it("nut flush on river is near certain", () => {
    const result = estimateEquity(cards("As", "Ks"), cards("2s", "7s", "9s", "3d", "4h"));
    expect(equityOf(result)).toBeGreaterThan(0.9);
  });

  it("probabilities always sum to one on the river", () => {
    const result = estimateEquity(cards("2c", "7d"), cards("As", "Ks", "Qs", "Js", "10h"));
    const total = result.winProbability + result.tieProbability + result.loseProbability;
    expect(total).toBeCloseTo(1, 3);
  });

  it("probabilities always sum to one preflop", () => {
    const result = estimateEquity(cards("7h", "2c"), [], 3000, seededRng(7));
    const total = result.winProbability + result.tieProbability + result.loseProbability;
    expect(total).toBeCloseTo(1, 3);
  });
});
