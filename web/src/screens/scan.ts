import { cardPickerGrid, h } from "../components";
import { Card, isRedSuit, makeCard, rankLabel, SUIT_SYMBOL, Suit } from "../poker/card";
import { OCR_CROP_FRACTION, recognizeCards } from "../ocr";
import { activeBoardCards, AppState, store, streetInfo } from "../state";

/**
 * 카메라 화면. 칸을 나누지 않고 화면 전체를 한 번에 촬영해, Tesseract.js OCR로
 * 보이는 카드 랭크를 모두 자동 추출한다(부채꼴로 겹쳐 펼쳐 찍는 것을 전제).
 *
 * 자동 인식은 추정값이므로:
 *  - 무늬(♠♥♦♣)는 색상으로만 빨강/검정을 좁혀 기본값을 채우고,
 *  - 인식된 카드는 아래 슬롯에 채워진 뒤 사용자가 눌러 확인·수정하며,
 *  - OCR 엔진 로딩/인식 실패 시에도 수동 그리드로 그대로 입력할 수 있게 폴백한다.
 */
export function renderScan(root: HTMLElement, state: AppState, kind: "hero" | "board") {
  const slotCount = kind === "hero" ? 2 : streetInfo(state.street).boardCount;
  const existing = (kind === "hero" ? state.heroCards : activeBoardCards(state)).slice(0, slotCount);
  const localCards: (Card | null)[] = [...existing];
  while (localCards.length < slotCount) localCards.push(null);

  let currentIndex = Math.max(0, localCards.findIndex((c) => c === null));
  let stream: MediaStream | null = null;
  let recognizing = false;

  const screen = h("div", { class: "screen screen-scan" });

  const top = h("div", { class: "scan-top" }, [
    h("div", { class: "scan-title" }, [
      kind === "hero" ? `내 카드 ${slotCount}장을 촬영하세요` : `보드 카드 ${slotCount}장을 촬영하세요`,
    ]),
    h("div", { class: "scan-sub" }, [
      "숫자 모서리가 노란 칸 안에 크게 들어오도록, 밝은 곳에서 촬영하세요",
    ]),
  ]);

  const video = h("video", { class: "scan-video", autoplay: true, playsinline: true, muted: true }) as HTMLVideoElement;
  // 실제 인식 영역(중앙 밴드)과 일치하는 단일 가이드 프레임. 이 안을 카드로 꽉 채우도록 유도한다.
  const frameGuide = h("div", { class: "scan-frame-guide" });
  frameGuide.style.left = `${OCR_CROP_FRACTION.x * 100}%`;
  frameGuide.style.top = `${OCR_CROP_FRACTION.y * 100}%`;
  frameGuide.style.width = `${OCR_CROP_FRACTION.w * 100}%`;
  frameGuide.style.height = `${OCR_CROP_FRACTION.h * 100}%`;
  const frameHint = h("div", { class: "scan-frame-hint" }, ["이 칸을 카드로 꽉 채우세요"]);
  const videoWrap = h("div", { class: "scan-video-wrap" }, [video, frameGuide, frameHint]);
  const cameraStatus = h("div", { class: "camera-status" });

  // 인식된/선택된 카드 슬롯 (확인·수정용)
  const slotsLabel = h("div", { class: "section-label" }, ["인식 결과 (눌러서 수정)"]);
  const slotsRow = h("div", { class: "scan-slots" });
  const slotEls: HTMLElement[] = [];
  for (let i = 0; i < slotCount; i++) {
    const slot = h("button", { class: "scan-slot", type: "button" });
    slot.addEventListener("click", () => {
      currentIndex = i;
      updateSlots();
      refreshPicker();
    });
    slotEls.push(slot);
    slotsRow.append(slot);
  }

  const captureBtn = h("button", { class: "btn btn-solid", type: "button" }, ["📷 촬영해서 자동 인식"]);
  const pickerToggle = h("button", { class: "text-btn", type: "button" }, ["직접 선택 / 수정하기 ▾"]);
  const pickerHost = h("div", { class: "scan-picker-host collapsed" });

  const bottom = h("div", { class: "scan-bottom" });
  const cancelBtn = h("button", { class: "outline-btn small", type: "button" }, ["취소"]);
  const doneBtn = h("button", { class: "btn btn-solid small", type: "button", disabled: true }, ["완료"]);
  bottom.append(cancelBtn, doneBtn);

  screen.append(top, videoWrap, cameraStatus, captureBtn, slotsLabel, slotsRow, pickerToggle, pickerHost, bottom);
  root.append(screen);

  function otherUsedCards(): Card[] {
    return kind === "hero"
      ? activeBoardCards(state).filter((c): c is Card => c !== null)
      : state.heroCards.filter((c): c is Card => c !== null);
  }

  function updateSlots() {
    slotEls.forEach((slot, i) => {
      slot.className = "scan-slot" + (i === currentIndex ? " active" : "");
      slot.innerHTML = "";
      const c = localCards[i];
      if (c) {
        slot.classList.add(isRedSuit(c.suit) ? "red" : "blk");
        slot.append(
          h("span", { class: "slot-rank" }, [rankLabel(c.rank)]),
          h("span", { class: "slot-suit" }, [SUIT_SYMBOL[c.suit]]),
        );
      } else {
        slot.append(h("span", { class: "slot-empty" }, [String(i + 1)]));
      }
    });
    doneBtn.toggleAttribute("disabled", localCards.some((c) => c === null));
  }

  function refreshPicker() {
    pickerHost.innerHTML = "";
    const sessionUsed = localCards.filter((c): c is Card => c !== null);
    const currentCard = localCards[currentIndex];
    const disabled = [...otherUsedCards(), ...sessionUsed].filter(
      (c) => !currentCard || c.rank !== currentCard.rank || c.suit !== currentCard.suit,
    );
    pickerHost.append(
      cardPickerGrid(disabled, (card) => {
        localCards[currentIndex] = card;
        const nextEmpty = localCards.findIndex((c) => c === null);
        if (nextEmpty !== -1) currentIndex = nextEmpty;
        updateSlots();
        refreshPicker();
      }),
    );
  }

  /** 색상 추정(빨강/검정)만으로 기본 무늬를 정한다. 정확한 무늬는 사용자가 슬롯을 눌러 수정. */
  function defaultSuitForColor(isRed: boolean, taken: Set<string>): Suit {
    const reds = [Suit.HEARTS, Suit.DIAMONDS];
    const blacks = [Suit.SPADES, Suit.CLUBS];
    const order = isRed ? [...reds, ...blacks] : [...blacks, ...reds];
    return order.find((s) => !taken.has(s)) ?? order[0];
  }

  function captureFrame(): HTMLCanvasElement | null {
    if (!video.videoWidth || !video.videoHeight) return null;
    const canvas = document.createElement("canvas");
    // 전처리(크롭·확대)가 뒤에서 이뤄지므로 여기서는 원본 해상도를 최대한 보존한다(과도한 크기만 제한).
    const scale = Math.min(1, 1920 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  async function onCapture() {
    if (recognizing) return;
    const canvas = captureFrame();
    if (!canvas) {
      showStatus("카메라 미리보기가 준비되지 않았습니다. 아래에서 직접 선택하세요.");
      return;
    }
    recognizing = true;
    captureBtn.setAttribute("disabled", "");
    captureBtn.textContent = "인식 중...";
    showStatus("");
    try {
      // 이미 확정된 카드(다른 슬롯/영역)는 중복 배정하지 않도록 추적.
      const taken = new Set<string>([...otherUsedCards(), ...localCards.filter((c): c is Card => c !== null)].map((c) => c.suit + c.rank));
      const guesses = await recognizeCards(canvas, slotCount);
      if (guesses.length === 0) {
        showStatus("카드를 읽지 못했어요. 더 밝은 곳에서 숫자 모서리가 보이게 다시 찍거나, 아래에서 직접 선택하세요.");
      } else {
        let filled = 0;
        for (const g of guesses) {
          const idx = localCards.findIndex((c) => c === null);
          if (idx === -1) break;
          const suitTaken = new Set(
            [...otherUsedCards(), ...localCards.filter((c): c is Card => c !== null)]
              .filter((c) => c.rank === g.rank)
              .map((c) => c.suit as string),
          );
          const suit = defaultSuitForColor(g.isRed, suitTaken);
          const card = makeCard(g.rank, suit);
          const key = card.suit + card.rank;
          if (taken.has(key)) continue;
          taken.add(key);
          localCards[idx] = card;
          filled++;
        }
        const nextEmpty = localCards.findIndex((c) => c === null);
        if (nextEmpty !== -1) currentIndex = nextEmpty;
        showStatus(
          `${filled}장 인식했어요. 무늬는 색으로 추정한 값이니 슬롯을 눌러 확인·수정하세요.` +
            (filled < slotCount ? " 못 채운 칸은 직접 선택하면 됩니다." : ""),
        );
        expandPicker();
      }
      updateSlots();
      refreshPicker();
    } catch {
      showStatus("자동 인식 엔진을 불러오지 못했습니다(네트워크 필요). 아래에서 직접 선택해주세요.");
      expandPicker();
    } finally {
      recognizing = false;
      captureBtn.removeAttribute("disabled");
      captureBtn.textContent = "📷 다시 촬영해서 인식";
    }
  }

  function showStatus(msg: string) {
    cameraStatus.textContent = msg;
    cameraStatus.classList.toggle("visible", msg.length > 0);
  }

  function expandPicker() {
    pickerHost.classList.remove("collapsed");
    pickerToggle.textContent = "직접 선택 / 수정하기 ▴";
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      showStatus("이 브라우저에서는 카메라를 사용할 수 없습니다. 아래에서 바로 카드를 선택하세요.");
      captureBtn.setAttribute("disabled", "");
      expandPicker();
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
    } catch {
      showStatus("카메라 권한이 없어 촬영할 수 없습니다. 아래에서 바로 카드를 선택하세요.");
      captureBtn.setAttribute("disabled", "");
      expandPicker();
    }
  }

  captureBtn.addEventListener("click", () => void onCapture());
  pickerToggle.addEventListener("click", () => {
    const collapsed = pickerHost.classList.toggle("collapsed");
    pickerToggle.textContent = collapsed ? "직접 선택 / 수정하기 ▾" : "직접 선택 / 수정하기 ▴";
  });
  cancelBtn.addEventListener("click", () => {
    stopCamera();
    store.goto("setup");
  });
  doneBtn.addEventListener("click", () => {
    stopCamera();
    if (kind === "hero") store.setHeroCards(localCards);
    else store.setBoardCards(localCards);
    store.goto("setup");
  });

  updateSlots();
  refreshPicker();
  void startCamera();
}
