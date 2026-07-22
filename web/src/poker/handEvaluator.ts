import { Card } from "./card";

export enum HandCategory {
  HIGH_CARD = 0,
  ONE_PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
}

export const HAND_CATEGORY_LABEL_KO: Record<HandCategory, string> = {
  [HandCategory.HIGH_CARD]: "하이 카드",
  [HandCategory.ONE_PAIR]: "원 페어",
  [HandCategory.TWO_PAIR]: "투 페어",
  [HandCategory.THREE_OF_A_KIND]: "트리플",
  [HandCategory.STRAIGHT]: "스트레이트",
  [HandCategory.FLUSH]: "플러시",
  [HandCategory.FULL_HOUSE]: "풀 하우스",
  [HandCategory.FOUR_OF_A_KIND]: "포카드",
  [HandCategory.STRAIGHT_FLUSH]: "스트레이트 플러시",
};

export interface HandValue {
  category: HandCategory;
  tiebreakers: number[];
}

/** 양수면 a가 강함, 음수면 b가 강함, 0이면 동률. */
export function compareHandValues(a: HandValue, b: HandValue): number {
  if (a.category !== b.category) return a.category - b.category;
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
  for (let i = 0; i < len; i++) {
    const diff = (a.tiebreakers[i] ?? 0) - (b.tiebreakers[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** [cards]는 5장에서 7장 사이여야 한다 (홀 카드 + 보드). */
export function bestHand(cards: Card[]): HandValue {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error(`카드는 5~7장이어야 합니다 (현재 ${cards.length}장)`);
  }
  if (cards.length === 5) return evaluateFive(cards);
  let best: HandValue | null = null;
  for (const combo of combinations(cards, 5)) {
    const value = evaluateFive(combo);
    if (best === null || compareHandValues(value, best) > 0) best = value;
  }
  return best!;
}

function evaluateFive(cards: Card[]): HandValue {
  const sortedDesc = [...cards].sort((a, b) => b.rank - a.rank);
  const isFlush = new Set(cards.map((c) => c.suit)).size === 1;

  const distinctRanksDesc = Array.from(new Set(sortedDesc.map((c) => c.rank)));
  const straightHigh = straightHighCard(distinctRanksDesc);
  const isStraight = straightHigh !== null;

  if (isFlush && isStraight) {
    return { category: HandCategory.STRAIGHT_FLUSH, tiebreakers: [straightHigh!] };
  }

  const counts = new Map<number, number>();
  for (const c of cards) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const groups = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  if (groups[0][1] === 4) {
    const kicker = groups.find((g) => g[1] === 1)![0];
    return { category: HandCategory.FOUR_OF_A_KIND, tiebreakers: [groups[0][0], kicker] };
  }
  if (groups[0][1] === 3 && groups.length > 1 && groups[1][1] >= 2) {
    return { category: HandCategory.FULL_HOUSE, tiebreakers: [groups[0][0], groups[1][0]] };
  }
  if (isFlush) {
    return { category: HandCategory.FLUSH, tiebreakers: sortedDesc.map((c) => c.rank) };
  }
  if (isStraight) {
    return { category: HandCategory.STRAIGHT, tiebreakers: [straightHigh!] };
  }
  if (groups[0][1] === 3) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return { category: HandCategory.THREE_OF_A_KIND, tiebreakers: [groups[0][0], ...kickers] };
  }
  if (groups[0][1] === 2 && groups.length > 1 && groups[1][1] === 2) {
    const kicker = groups.find((g) => g[1] === 1)![0];
    return { category: HandCategory.TWO_PAIR, tiebreakers: [groups[0][0], groups[1][0], kicker] };
  }
  if (groups[0][1] === 2) {
    const kickers = groups.filter((g) => g[1] === 1).map((g) => g[0]).sort((a, b) => b - a);
    return { category: HandCategory.ONE_PAIR, tiebreakers: [groups[0][0], ...kickers] };
  }
  return { category: HandCategory.HIGH_CARD, tiebreakers: sortedDesc.map((c) => c.rank) };
}

/** 내림차순 distinct 랭크 목록에서 스트레이트가 있으면 가장 높은 카드 값을 반환한다. A-2-3-4-5(휠)도 처리한다. */
function straightHighCard(distinctRanksDesc: number[]): number | null {
  if (distinctRanksDesc.length < 5) return null;
  for (let i = 0; i <= distinctRanksDesc.length - 5; i++) {
    const window = distinctRanksDesc.slice(i, i + 5);
    if (window[0] - window[4] === 4) return window[0];
  }
  const wheel = [14, 5, 4, 3, 2];
  if (wheel.every((r) => distinctRanksDesc.includes(r))) return 5;
  return null;
}

function combinations<T>(items: T[], k: number): T[][] {
  const result: T[][] = [];
  const current: T[] = [];
  function recurse(start: number) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < items.length; i++) {
      current.push(items[i]);
      recurse(i + 1);
      current.pop();
    }
  }
  recurse(0);
  return result;
}
