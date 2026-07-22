import { Card, cardsEqual } from "./poker/card";
import { Advice, advise } from "./poker/advisor";

export const STREETS = [
  { key: "PREFLOP", boardCount: 0, label: "프리플랍 (보드 없음)" },
  { key: "FLOP", boardCount: 3, label: "플랍 (3장)" },
  { key: "TURN", boardCount: 4, label: "턴 (4장)" },
  { key: "RIVER", boardCount: 5, label: "리버 (5장)" },
] as const;

export type StreetKey = (typeof STREETS)[number]["key"];

export function streetInfo(key: StreetKey) {
  return STREETS.find((s) => s.key === key)!;
}

export type Screen = "home" | "setup" | "scan-hero" | "scan-board" | "input" | "result" | "learn";

export interface AppState {
  screen: Screen;
  cameFrom: Screen;
  street: StreetKey;
  heroCards: (Card | null)[];
  boardCards: (Card | null)[];
  potText: string;
  toCallText: string;
  heroStackText: string;
  isCalculating: boolean;
  advice: Advice | null;
  errorMessage: string | null;
  cardPickerTarget: { kind: "hero" | "board"; index: number } | null;
}

function initialState(): AppState {
  return {
    screen: "home",
    cameFrom: "home",
    street: "PREFLOP",
    heroCards: [null, null],
    boardCards: [null, null, null, null, null],
    potText: "100",
    toCallText: "20",
    heroStackText: "500",
    isCalculating: false,
    advice: null,
    errorMessage: null,
    cardPickerTarget: null,
  };
}

export function activeBoardCards(state: AppState): (Card | null)[] {
  return state.boardCards.slice(0, streetInfo(state.street).boardCount);
}

export function usedCards(state: AppState): Card[] {
  return [...state.heroCards, ...activeBoardCards(state)].filter((c): c is Card => c !== null);
}

export function isHeroComplete(state: AppState): boolean {
  return state.heroCards.every((c) => c !== null);
}

export function isBoardComplete(state: AppState): boolean {
  return activeBoardCards(state).every((c) => c !== null);
}

export function hasDuplicates(state: AppState): boolean {
  const known = usedCards(state);
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      if (cardsEqual(known[i], known[j])) return true;
    }
  }
  return false;
}

type Listener = () => void;

class Store {
  state: AppState = initialState();
  private listeners: Listener[] = [];

  subscribe(fn: Listener): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  set(patch: Partial<AppState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  goto(screen: Screen) {
    this.set({ screen, cameFrom: this.state.screen });
  }

  setStreet(street: StreetKey) {
    this.set({ street, advice: null, errorMessage: null });
  }

  setHeroCard(index: number, card: Card | null) {
    const heroCards = [...this.state.heroCards];
    heroCards[index] = card;
    this.set({ heroCards, advice: null, errorMessage: null });
  }

  setBoardCard(index: number, card: Card | null) {
    const boardCards = [...this.state.boardCards];
    boardCards[index] = card;
    this.set({ boardCards, advice: null, errorMessage: null });
  }

  openCardPicker(kind: "hero" | "board", index: number) {
    this.set({ cardPickerTarget: { kind, index } });
  }

  closeCardPicker() {
    this.set({ cardPickerTarget: null });
  }

  pickCard(card: Card | null) {
    const target = this.state.cardPickerTarget;
    if (!target) return;
    if (target.kind === "hero") this.setHeroCard(target.index, card);
    else this.setBoardCard(target.index, card);
    this.set({ cardPickerTarget: null });
  }

  setHeroCards(cards: (Card | null)[]) {
    this.set({ heroCards: cards.slice(0, 2), advice: null, errorMessage: null });
  }

  setBoardCards(cards: (Card | null)[]) {
    const padded = [...cards, null, null, null, null, null].slice(0, 5);
    this.set({ boardCards: padded, advice: null, errorMessage: null });
  }

  setPotText(text: string) {
    this.set({ potText: text, advice: null });
  }
  setToCallText(text: string) {
    this.set({ toCallText: text, advice: null });
  }
  setHeroStackText(text: string) {
    this.set({ heroStackText: text, advice: null });
  }

  calculateAdvice() {
    const s = this.state;
    if (!isHeroComplete(s)) {
      this.set({ errorMessage: "내 카드 2장을 모두 선택해주세요." });
      return;
    }
    if (!isBoardComplete(s)) {
      this.set({ errorMessage: "보드 카드를 모두 선택해주세요." });
      return;
    }
    if (hasDuplicates(s)) {
      this.set({ errorMessage: "같은 카드가 중복 선택되었습니다." });
      return;
    }
    const pot = Number(s.potText);
    const toCall = Number(s.toCallText);
    const heroStack = Number(s.heroStackText);
    if (
      !Number.isFinite(pot) || !Number.isFinite(toCall) || !Number.isFinite(heroStack) ||
      pot < 0 || toCall < 0 || heroStack < 0
    ) {
      this.set({ errorMessage: "팟/베팅/스택 금액을 숫자로 올바르게 입력해주세요." });
      return;
    }

    this.set({ isCalculating: true, errorMessage: null });
    // 계산 과정을 시각적으로 느낄 수 있도록 약간의 지연 후 실행 (몬테카를로 시뮬레이션 자체는 동기 실행).
    window.setTimeout(() => {
      const heroHole = s.heroCards.filter((c): c is Card => c !== null);
      const board = activeBoardCards(s).filter((c): c is Card => c !== null);
      const advice = advise(heroHole, board, pot, toCall, heroStack);
      this.set({ isCalculating: false, advice });
    }, 260);
  }

  resetCards() {
    this.set({
      heroCards: [null, null],
      boardCards: [null, null, null, null, null],
      street: "PREFLOP",
      advice: null,
      errorMessage: null,
    });
  }
}

export const store = new Store();
