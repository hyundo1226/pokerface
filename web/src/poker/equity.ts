import { Card } from "./card";
import { remainingDeck } from "./deck";
import { bestHand, compareHandValues } from "./handEvaluator";

export interface EquityResult {
  winProbability: number;
  tieProbability: number;
  loseProbability: number;
  trials: number;
}

/** 무승부를 절반의 승리로 환산한 실질 승률 (팟 오즈 비교에 사용). */
export function equityOf(result: EquityResult): number {
  return result.winProbability + result.tieProbability / 2;
}

/**
 * 둘이서(헤즈업) 플레이 시, 상대 홀카드는 알 수 없다고 가정하고
 * 남은 덱에서 균등 무작위로 뽑는다는 전제로 승률을 추정한다.
 *
 * 리버(보드 5장 완성)에서는 상대 홀카드 조합을 전수 계산해 정확한 승률을 낸다.
 * 그 이전 스트리트에서는 몬테카를로 시뮬레이션으로 추정한다.
 */
export function estimateEquity(
  heroHole: Card[],
  board: Card[],
  trials = 12000,
  rng: () => number = Math.random,
): EquityResult {
  if (heroHole.length !== 2) throw new Error("홀 카드는 2장이어야 합니다");
  if (board.length < 0 || board.length > 5) throw new Error("보드는 0~5장이어야 합니다");

  const deck = remainingDeck([...heroHole, ...board]);
  const boardNeeded = 5 - board.length;

  if (boardNeeded === 0) {
    return exactRiverEquity(heroHole, board, deck);
  }
  return monteCarloEquity(heroHole, board, deck, boardNeeded, trials, rng);
}

function exactRiverEquity(heroHole: Card[], board: Card[], deck: Card[]): EquityResult {
  const heroValue = bestHand([...heroHole, ...board]);
  let win = 0, tie = 0, lose = 0;
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      const villainValue = bestHand([deck[i], deck[j], ...board]);
      const cmp = compareHandValues(heroValue, villainValue);
      if (cmp > 0) win++;
      else if (cmp === 0) tie++;
      else lose++;
    }
  }
  const total = win + tie + lose;
  return { winProbability: win / total, tieProbability: tie / total, loseProbability: lose / total, trials: total };
}

function monteCarloEquity(
  heroHole: Card[],
  board: Card[],
  deck: Card[],
  boardNeeded: number,
  trials: number,
  rng: () => number,
): EquityResult {
  const pool = [...deck];
  const drawCount = 2 + boardNeeded;
  let win = 0, tie = 0, lose = 0;

  for (let t = 0; t < trials; t++) {
    partialShuffle(pool, drawCount, rng);
    const villainHole = [pool[0], pool[1]];
    const fullBoard = boardNeeded > 0 ? [...board, ...pool.slice(2, 2 + boardNeeded)] : board;

    const heroValue = bestHand([...heroHole, ...fullBoard]);
    const villainValue = bestHand([...villainHole, ...fullBoard]);
    const cmp = compareHandValues(heroValue, villainValue);
    if (cmp > 0) win++;
    else if (cmp === 0) tie++;
    else lose++;
  }

  return { winProbability: win / trials, tieProbability: tie / trials, loseProbability: lose / trials, trials };
}

/** [list]의 앞 [count]개 위치를 무작위 표본으로 채우는 부분 피셔-예이츠 셔플. */
function partialShuffle<T>(list: T[], count: number, rng: () => number): void {
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (list.length - i));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
}
