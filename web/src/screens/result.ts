import { h } from "../components";
import { Action, ACTION_LABEL_KO, Advice } from "../poker/advisor";
import { AppState, store } from "../state";

const pct = (x: number) => (x * 100).toFixed(1);

const ACTION_CLASS: Record<Action, string> = {
  [Action.FOLD]: "badge-fold",
  [Action.CHECK]: "badge-check",
  [Action.CALL]: "badge-call",
  [Action.RAISE]: "badge-raise",
  [Action.ALL_IN]: "badge-allin",
};

export function renderResult(root: HTMLElement, state: AppState) {
  const screen = h("div", { class: "screen screen-result" });

  if (state.errorMessage) {
    screen.append(
      h("div", { class: "result-center" }, [
        h("h2", { class: "setup-h" }, ["입력값을 확인해주세요"]),
        h("p", { class: "warn-text" }, [state.errorMessage]),
        backButton("돌아가기", () => store.goto("input")),
      ]),
    );
    root.append(screen);
    return;
  }

  if (state.isCalculating || !state.advice) {
    screen.append(
      h("div", { class: "result-center" }, [
        h("div", { class: "spinner" }),
        h("p", { class: "muted" }, ["수천 번의 가상 대결로 승률을 계산하고 있어요..."]),
      ]),
    );
    root.append(screen);
    return;
  }

  const advice = state.advice;
  const scroll = h("div", { class: "result-scroll" });

  scroll.append(
    h("div", { class: "action-badge " + ACTION_CLASS[advice.action] }, [ACTION_LABEL_KO[advice.action]]),
  );

  scroll.append(equityBar(advice));

  const line =
    `예측 승률 ${pct(advice.equity)}%` +
    (advice.requiredEquity !== null ? `  ·  필요 승률(팟 오즈) ${pct(advice.requiredEquity)}%` : "");
  scroll.append(h("p", { class: "result-line" }, [line]));
  scroll.append(h("p", { class: "hand-tag" }, [`핸드: ${advice.handDescription}`]));

  scroll.append(h("h3", { class: "why-title" }, ["왜 이 선택이 좋을까요?"]));
  const reasons = h("div", { class: "reasons" });
  for (const reason of advice.reasons.filter((r) => r.trim().length > 0)) {
    reasons.append(h("div", { class: "reason" }, [reason]));
  }
  scroll.append(reasons);

  scroll.append(
    (() => {
      const b = h("button", { class: "btn btn-solid", type: "button" }, ["새 핸드 분석하기"]);
      b.addEventListener("click", () => {
        store.resetCards();
        store.goto("setup");
      });
      return b;
    })(),
  );
  scroll.append(backButton("팟 오즈 · 승률 개념 배우기", () => store.goto("learn"), "outline-btn"));

  screen.append(scroll);
  root.append(screen);
}

function equityBar(advice: Advice): HTMLElement {
  const r = advice.equityResult;
  const bar = h("div", { class: "equity-bar" }, [
    h("span", { class: "seg-win", style: `flex:${Math.max(r.winProbability, 0.001)}` }),
    h("span", { class: "seg-tie", style: `flex:${Math.max(r.tieProbability, 0.001)}` }),
    h("span", { class: "seg-lose", style: `flex:${Math.max(r.loseProbability, 0.001)}` }),
  ]);
  return h("div", { class: "equity-block" }, [
    h("div", { class: "section-label" }, ["승 / 무 / 패"]),
    bar,
    h("div", { class: "equity-nums" }, [
      `승 ${pct(r.winProbability)}%  ·  무 ${pct(r.tieProbability)}%  ·  패 ${pct(r.loseProbability)}%`,
    ]),
  ]);
}

function backButton(label: string, onClick: () => void, cls = "btn btn-outline"): HTMLElement {
  const b = h("button", { class: cls, type: "button" }, [label]);
  b.addEventListener("click", onClick);
  return b;
}
