import { Card } from "./card";
import { EquityResult, equityOf, estimateEquity } from "./equity";
import { bestHand, HAND_CATEGORY_LABEL_KO } from "./handEvaluator";

export enum Action {
  FOLD = "FOLD",
  CHECK = "CHECK",
  CALL = "CALL",
  RAISE = "RAISE",
  ALL_IN = "ALL_IN",
}

export const ACTION_LABEL_KO: Record<Action, string> = {
  [Action.FOLD]: "다이 (폴드)",
  [Action.CHECK]: "체크",
  [Action.CALL]: "콜",
  [Action.RAISE]: "레이즈",
  [Action.ALL_IN]: "올인",
};

export interface Advice {
  action: Action;
  equity: number;
  requiredEquity: number | null;
  callEv: number | null;
  reasons: string[];
  handDescription: string;
  equityResult: EquityResult;
}

const pct = (x: number) => (x * 100).toFixed(1);
const fmt = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(2));

/**
 * 헤즈업(둘이서) 텍사스 홀덤 기준으로, 현재 승률과 팟 오즈를 비교해
 * 폴드/체크/콜/레이즈/올인 중 무엇이 수학적으로 유리한지 추천하고 그 이유를 설명한다.
 *
 * 주의: 이 로직은 상대의 성향이나 블러프 가능성을 고려하지 않는 단순화된 EV(기댓값) 계산이다.
 */
export function advise(
  heroHole: Card[],
  board: Card[],
  pot: number,
  amountToCall: number,
  heroStack: number,
  trials = 12000,
  rng: () => number = Math.random,
): Advice {
  if (heroHole.length !== 2) throw new Error("홀 카드는 2장이어야 합니다");
  if (pot < 0 || amountToCall < 0 || heroStack < 0) throw new Error("금액은 0 이상이어야 합니다");

  const equityResult = estimateEquity(heroHole, board, trials, rng);
  const equity = equityOf(equityResult);
  const handDescription =
    heroHole.length + board.length >= 5
      ? HAND_CATEGORY_LABEL_KO[bestHand([...heroHole, ...board]).category]
      : "프리플랍";

  if (amountToCall <= 0) {
    return adviseWithNothingToCall(equity, equityResult, handDescription);
  }

  const effectiveToCall = Math.min(amountToCall, heroStack);
  const isAllInCall = amountToCall >= heroStack;
  const requiredEquity = effectiveToCall / (pot + effectiveToCall);
  const margin = equity - requiredEquity;
  const callEv = equity * (pot + effectiveToCall) - effectiveToCall;

  const reasons: string[] = [
    `현재 팟은 ${fmt(pot)}, 콜 금액은 ${fmt(effectiveToCall)}입니다. ` +
      `콜이 손해가 아니려면 최소 ${pct(requiredEquity)}%의 승률이 필요합니다 (팟 오즈).`,
    `이번 핸드의 예측 승률(무승부는 절반으로 계산)은 약 ${pct(equity)}%입니다.`,
  ];

  let action: Action;
  if (isAllInCall) {
    action = margin >= 0 ? Action.CALL : Action.FOLD;
  } else if (margin < 0) {
    action = Action.FOLD;
  } else if (margin < 0.08) {
    action = Action.CALL;
  } else if (margin < 0.2 || equity < 0.65) {
    action = Action.RAISE;
  } else {
    action = Action.ALL_IN;
  }

  switch (action) {
    case Action.FOLD:
      reasons.push(
        `필요 승률(${pct(requiredEquity)}%)보다 예측 승률(${pct(equity)}%)이 낮습니다. ` +
          `이 상황에서 계속 콜하면 장기적으로 손해이므로 다이(폴드)가 정답입니다.`,
      );
      break;
    case Action.CALL:
      reasons.push(
        isAllInCall
          ? "이미 스택 대부분이 걸린 올인 콜 상황입니다. 승률이 필요 승률 이상이므로 콜하는 것이 유리합니다."
          : "필요 승률과 예측 승률의 차이가 크지 않습니다. 무리한 레이즈보다 콜로 다음 카드를 확인하는 것이 안전합니다.",
      );
      break;
    case Action.RAISE:
      reasons.push(
        `예측 승률이 필요 승률보다 충분히 높습니다(여유분 ${pct(margin)}%p). ` +
          `레이즈로 팟을 키우면 상대의 실수를 유도하고 기대 이득을 극대화할 수 있습니다.`,
      );
      break;
    case Action.ALL_IN:
      reasons.push(
        `승률이 매우 높고 여유분도 커서(${pct(margin)}%p) 상대가 콜하더라도 크게 유리합니다. ` +
          `올인으로 최대 이득을 노려볼 만한 상황입니다.`,
      );
      break;
  }

  return { action, equity, requiredEquity, callEv, reasons, handDescription, equityResult };
}

function adviseWithNothingToCall(equity: number, equityResult: EquityResult, handDescription: string): Advice {
  const reasons: string[] = [`콜해야 할 베팅이 없는 상황입니다 (체크 가능). 예측 승률은 약 ${pct(equity)}%입니다.`];
  const action = equity >= 0.7 ? Action.RAISE : Action.CHECK;
  reasons.push(
    action === Action.RAISE
      ? "승률이 매우 높습니다. 공짜로 다음 카드를 보여주기보다 베팅(레이즈)해서 상대에게서 가치를 뽑아내는 것이 좋습니다 (밸류 베팅)."
      : "승률이 아주 높지는 않습니다. 비용 없이 체크로 다음 카드를 확인하세요.",
  );
  return { action, equity, requiredEquity: null, callEv: null, reasons, handDescription, equityResult };
}
