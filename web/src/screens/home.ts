import { h } from "../components";
import { store } from "../state";

export function renderHome(root: HTMLElement) {
  root.append(
    h("div", { class: "screen screen-home" }, [
      h("div", { class: "home-card" }, [
        h("h1", { class: "home-title" }, ["♠ 포커페이스 ", h("span", { class: "gold" }, ["♥"])]),
        h("p", { class: "home-desc" }, [
          "둘이서(헤즈업) 텍사스 홀덤 전용 도우미입니다. ",
          "내 카드와 보드 카드를 입력하면 승률과 팟 오즈를 계산해서 ",
          "콜 / 다이 / 레이즈 / 올인 중 무엇이 유리한지, 그 이유까지 알려드려요.",
        ]),
        h(
          "button",
          { class: "btn btn-solid", type: "button", id: "start-btn" },
          ["핸드 분석 시작하기"],
        ),
        h(
          "button",
          { class: "btn btn-outline", type: "button", id: "learn-btn" },
          ["포커 기초 배우기"],
        ),
      ]),
    ]),
  );

  root.querySelector("#start-btn")!.addEventListener("click", () => store.goto("setup"));
  root.querySelector("#learn-btn")!.addEventListener("click", () => store.goto("learn"));
}
