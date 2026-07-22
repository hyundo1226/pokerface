import { ALL_RANKS, ALL_SUITS, Card, cardKey, makeCard } from "./card";

export const FULL_DECK: Card[] = ALL_SUITS.flatMap((suit) =>
  ALL_RANKS.map((rank) => makeCard(rank, suit)),
);

/** 이미 사용된 카드를 제외한 나머지 카드를 반환한다. */
export function remainingDeck(used: Card[]): Card[] {
  const usedKeys = new Set(used.map(cardKey));
  return FULL_DECK.filter((c) => !usedKeys.has(cardKey(c)));
}
