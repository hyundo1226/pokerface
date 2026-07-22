import { describe, expect, it } from "vitest";
import { cardFromCode } from "../card";
import { bestHand, compareHandValues, HandCategory } from "../handEvaluator";

const cards = (...codes: string[]) => codes.map(cardFromCode);

describe("HandEvaluator", () => {
  it("royal flush beats everything", () => {
    const hand = bestHand(cards("As", "Ks", "Qs", "Js", "10s"));
    expect(hand.category).toBe(HandCategory.STRAIGHT_FLUSH);
    expect(hand.tiebreakers[0]).toBe(14);
  });

  it("wheel straight A2345 is five high", () => {
    const hand = bestHand(cards("As", "2h", "3d", "4c", "5s"));
    expect(hand.category).toBe(HandCategory.STRAIGHT);
    expect(hand.tiebreakers[0]).toBe(5);
  });

  it("four of a kind beats full house", () => {
    const quads = bestHand(cards("9s", "9h", "9d", "9c", "2s"));
    const fullHouse = bestHand(cards("Ks", "Kh", "Kd", "2c", "2s"));
    expect(compareHandValues(quads, fullHouse)).toBeGreaterThan(0);
    expect(quads.category).toBe(HandCategory.FOUR_OF_A_KIND);
    expect(fullHouse.category).toBe(HandCategory.FULL_HOUSE);
  });

  it("flush beats straight", () => {
    const flush = bestHand(cards("2s", "5s", "9s", "Js", "Ks"));
    const straight = bestHand(cards("4h", "5d", "6c", "7s", "8h"));
    expect(compareHandValues(flush, straight)).toBeGreaterThan(0);
  });

  it("best five of seven is selected", () => {
    const hand = bestHand(cards("As", "Ah", "Ad", "2c", "3s", "7h", "9d"));
    expect(hand.category).toBe(HandCategory.THREE_OF_A_KIND);
    expect(hand.tiebreakers[0]).toBe(14);
  });

  it("two pair kicker breaks tie", () => {
    const better = bestHand(cards("Ks", "Kh", "5d", "5c", "As", "2h", "3d"));
    const worse = bestHand(cards("Ks", "Kh", "5d", "5c", "9s", "2h", "3d"));
    expect(compareHandValues(better, worse)).toBeGreaterThan(0);
    expect(better.category).toBe(HandCategory.TWO_PAIR);
  });

  it("card fromCode round trips rank and suit", () => {
    const c = cardFromCode("10d");
    expect(c.rank).toBe(10);
    expect(c.suit).toBe("DIAMONDS");
  });
});
