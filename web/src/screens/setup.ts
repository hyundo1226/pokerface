import { cardPickerGrid, h, playingCardSlot } from "../components";
import {
  activeBoardCards,
  AppState,
  hasDuplicates,
  isBoardComplete,
  isHeroComplete,
  STREETS,
  store,
  streetInfo,
  usedCards,
} from "../state";

export function renderSetup(root: HTMLElement, state: AppState) {
  const screen = h("div", { class: "screen screen-setup" });
  const scroll = h("div", { class: "setup-scroll" });

  scroll.append(h("h2", { class: "setup-h" }, ["스트리트를 선택하세요"]));

  const chips = h("div", { class: "chip-row" });
  for (const s of STREETS) {
    const chip = h(
      "button",
      { class: "chip" + (state.street === s.key ? " on" : ""), type: "button" },
      [s.label],
    );
    chip.addEventListener("click", () => store.setStreet(s.key));
    chips.append(chip);
  }
  scroll.append(chips);

  scroll.append(h("div", { class: "section-label" }, ["내 카드 (홀 카드 2장)"]));
  const heroRow = h("div", { class: "card-row" });
  state.heroCards.forEach((card, index) => {
    heroRow.append(playingCardSlot(card, () => store.openCardPicker("hero", index)));
  });
  scroll.append(heroRow);
  const scanHeroBtn = h("button", { class: "outline-btn", type: "button" }, ["📷 카메라로 내 카드 보며 선택"]);
  scanHeroBtn.addEventListener("click", () => store.goto("scan-hero"));
  scroll.append(scanHeroBtn);

  const info = streetInfo(state.street);
  if (info.boardCount > 0) {
    scroll.append(h("div", { class: "section-label" }, [`보드 카드 (${info.label})`]));
    const boardRow = h("div", { class: "card-row" });
    activeBoardCards(state).forEach((card, index) => {
      boardRow.append(playingCardSlot(card, () => store.openCardPicker("board", index)));
    });
    scroll.append(boardRow);
    const scanBoardBtn = h("button", { class: "outline-btn", type: "button" }, ["📷 카메라로 보드 카드 보며 선택"]);
    scanBoardBtn.addEventListener("click", () => store.goto("scan-board"));
    scroll.append(scanBoardBtn);
  }

  if (hasDuplicates(state)) {
    scroll.append(h("p", { class: "warn-text" }, ["⚠️ 같은 카드가 중복 선택되었습니다. 다시 확인해주세요."]));
  }

  const canProceed = isHeroComplete(state) && isBoardComplete(state) && !hasDuplicates(state);
  const nextBtn = h(
    "button",
    { class: "btn btn-solid", type: "button", disabled: !canProceed },
    ["다음: 베팅 정보 입력"],
  );
  nextBtn.addEventListener("click", () => {
    if (canProceed) store.goto("input");
  });
  scroll.append(nextBtn);

  screen.append(scroll);
  root.append(screen);

  if (state.cardPickerTarget) {
    const current =
      state.cardPickerTarget.kind === "hero"
        ? state.heroCards[state.cardPickerTarget.index]
        : state.boardCards[state.cardPickerTarget.index];
    const disabled = usedCards(state).filter((c) => !current || c.rank !== current.rank || c.suit !== current.suit);

    const overlay = h("div", { class: "modal-overlay" });
    const modal = h("div", { class: "modal" }, [
      h("h3", { class: "modal-title" }, ["카드 선택"]),
      cardPickerGrid(disabled, (card) => store.pickCard(card)),
      h(
        "button",
        { class: "text-btn", type: "button" },
        ["비우기"],
      ),
    ]);
    (modal.lastElementChild as HTMLElement).addEventListener("click", () => store.pickCard(null));
    overlay.append(modal);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) store.closeCardPicker();
    });
    root.append(overlay);
  }
}
