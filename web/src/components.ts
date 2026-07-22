import { ALL_RANKS, ALL_SUITS, Card, cardsEqual, isRedSuit, rankLabel, SUIT_SYMBOL, Suit } from "./poker/card";

type Attrs = Record<string, string | number | boolean | undefined>;

export function h(tag: string, attrs: Attrs = {}, children: (Node | string)[] = []): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === "class") el.className = String(value);
    else if (value === true) el.setAttribute(key, "");
    else el.setAttribute(key, String(value));
  }
  for (const child of children) {
    el.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}

export function text(tag: string, className: string, content: string): HTMLElement {
  return h(tag, { class: className }, [content]);
}

export function playingCardSlot(card: Card | null, onClick: () => void): HTMLElement {
  const slot = h("button", { class: "card-slot" + (card ? " filled" : ""), type: "button" });
  if (card) {
    const red = isRedSuit(card.suit);
    slot.classList.add(red ? "red" : "blk");
    slot.append(
      h("span", { class: "rank" }, [rankLabel(card.rank)]),
      h("span", { class: "suit" }, [SUIT_SYMBOL[card.suit]]),
    );
  } else {
    slot.append(h("span", { class: "plus" }, ["+"]));
  }
  slot.addEventListener("click", onClick);
  return slot;
}

export function cardPickerGrid(disabled: Card[], onPick: (card: Card) => void): HTMLElement {
  const grid = h("div", { class: "picker-grid" });
  for (const suit of ALL_SUITS) {
    const row = h("div", { class: "picker-row" });
    row.append(h("span", { class: "picker-suit" + (isRedSuit(suit) ? " red" : " blk") }, [SUIT_SYMBOL[suit]]));
    for (const rank of [...ALL_RANKS].reverse()) {
      const card: Card = { rank, suit };
      const isDisabled = disabled.some((c) => cardsEqual(c, card));
      const cell = h(
        "button",
        {
          class: "picker-cell" + (isDisabled ? " disabled" : isRedSuit(suit) ? " red" : " blk"),
          type: "button",
          disabled: isDisabled,
        },
        [rankLabel(rank)],
      );
      if (!isDisabled) cell.addEventListener("click", () => onPick(card));
      row.append(cell);
    }
    grid.append(row);
  }
  return grid;
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOL[suit];
}
