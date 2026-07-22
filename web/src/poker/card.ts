export enum Suit {
  SPADES = "SPADES",
  HEARTS = "HEARTS",
  DIAMONDS = "DIAMONDS",
  CLUBS = "CLUBS",
}

export const SUIT_SYMBOL: Record<Suit, string> = {
  [Suit.SPADES]: "♠",
  [Suit.HEARTS]: "♥",
  [Suit.DIAMONDS]: "♦",
  [Suit.CLUBS]: "♣",
};

export const SUIT_LABEL_KO: Record<Suit, string> = {
  [Suit.SPADES]: "스페이드",
  [Suit.HEARTS]: "하트",
  [Suit.DIAMONDS]: "다이아",
  [Suit.CLUBS]: "클럽",
};

export const ALL_SUITS: Suit[] = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];

export function isRedSuit(suit: Suit): boolean {
  return suit === Suit.HEARTS || suit === Suit.DIAMONDS;
}

export enum Rank {
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
}

export const ALL_RANKS: Rank[] = [
  Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN, Rank.EIGHT,
  Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN, Rank.KING, Rank.ACE,
];

export function rankLabel(rank: Rank): string {
  switch (rank) {
    case Rank.ACE: return "A";
    case Rank.KING: return "K";
    case Rank.QUEEN: return "Q";
    case Rank.JACK: return "J";
    default: return String(rank);
  }
}

export function rankFromLabel(label: string): Rank | null {
  const cleaned = label.trim().toUpperCase();
  switch (cleaned) {
    case "A": return Rank.ACE;
    case "K": return Rank.KING;
    case "Q": return Rank.QUEEN;
    case "J": return Rank.JACK;
    case "10": case "T": return Rank.TEN;
    case "9": return Rank.NINE;
    case "8": return Rank.EIGHT;
    case "7": return Rank.SEVEN;
    case "6": return Rank.SIX;
    case "5": return Rank.FIVE;
    case "4": return Rank.FOUR;
    case "3": return Rank.THREE;
    case "2": return Rank.TWO;
    default: return null;
  }
}

export interface Card {
  rank: Rank;
  suit: Suit;
}

export function makeCard(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

export function cardCode(card: Card): string {
  return `${rankLabel(card.rank)}${card.suit[0]}`;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

export function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}`;
}

/** "As" / "Td" / "9h" / "10c" 같은 표기를 파싱한다. 테스트 편의용. */
export function cardFromCode(code: string): Card {
  const trimmed = code.trim();
  const rankPart = trimmed.slice(0, -1);
  const suitChar = trimmed.slice(-1).toLowerCase();
  const rank = rankFromLabel(rankPart);
  if (rank === null) throw new Error(`잘못된 카드 코드: ${code}`);
  const suit = ALL_SUITS.find((s) => s[0].toLowerCase() === suitChar);
  if (!suit) throw new Error(`잘못된 카드 코드: ${code}`);
  return { rank, suit };
}
