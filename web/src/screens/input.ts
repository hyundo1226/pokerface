import { h } from "../components";
import { AppState, store } from "../state";

export function renderInput(root: HTMLElement, state: AppState) {
  const screen = h("div", { class: "screen screen-input" });
  const scroll = h("div", { class: "input-scroll" });

  scroll.append(
    h("h2", { class: "setup-h" }, ["베팅 정보를 입력하세요"]),
    h("p", { class: "input-hint" }, ["정확한 금액이 아니어도 괜찮아요. 비율(예: 팟 100 / 콜 20)만 맞으면 됩니다."]),
  );

  scroll.append(field("현재 팟 크기", state.potText, (v) => store.setPotText(v)));
  scroll.append(field("내가 콜해야 하는 금액 (베팅이 없으면 0)", state.toCallText, (v) => store.setToCallText(v)));
  scroll.append(field("내 남은 스택", state.heroStackText, (v) => store.setHeroStackText(v)));

  if (state.errorMessage) {
    scroll.append(h("p", { class: "warn-text" }, [state.errorMessage]));
  }

  const calcBtn = h("button", { class: "btn btn-solid tall", type: "button" }, ["승률 계산하고 추천받기"]);
  calcBtn.addEventListener("click", () => {
    store.calculateAdvice();
    store.goto("result");
  });
  scroll.append(calcBtn);

  const backBtn = h("button", { class: "text-btn center", type: "button" }, ["← 카드 다시 선택"]);
  backBtn.addEventListener("click", () => store.goto("setup"));
  scroll.append(backBtn);

  screen.append(scroll);
  root.append(screen);
}

function field(label: string, value: string, onInput: (v: string) => void): HTMLElement {
  const input = h("input", {
    class: "text-input",
    type: "number",
    inputmode: "numeric",
    min: "0",
    value,
  }) as HTMLInputElement;
  input.addEventListener("input", () => onInput(input.value));
  return h("div", { class: "field" }, [h("label", { class: "section-label" }, [label]), input]);
}
