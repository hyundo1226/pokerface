import { cardPickerGrid, h } from "../components";
import { Card, isRedSuit, rankLabel, SUIT_SYMBOL } from "../poker/card";
import { activeBoardCards, AppState, store, streetInfo } from "../state";

/**
 * 카메라 화면. 실시간 OCR로 카드를 자동 인식하는 대신, 카메라 화면을 "참고용 라이브 뷰"로 보여주고
 * 사용자가 화면을 보면서 아래 그리드에서 같은 카드를 직접 눌러 빠르게 채우도록 했다.
 * (브라우저에서 무늬 기호까지 신뢰성 있게 자동 인식하려면 전용 모델이 필요해서, 정확성이 검증되지
 * 않은 자동 인식을 흉내내기보다 이 방식이 더 정직하고 실용적이라고 판단했다.)
 */
export function renderScan(root: HTMLElement, state: AppState, kind: "hero" | "board") {
  const slotCount = kind === "hero" ? 2 : streetInfo(state.street).boardCount;
  const existing = (kind === "hero" ? state.heroCards : activeBoardCards(state)).slice(0, slotCount);
  const localCards: (Card | null)[] = [...existing];
  while (localCards.length < slotCount) localCards.push(null);

  let currentIndex = Math.max(0, localCards.findIndex((c) => c === null));
  let stream: MediaStream | null = null;

  const screen = h("div", { class: "screen screen-scan" });

  const top = h("div", { class: "scan-top" }, [
    h("div", { class: "scan-title" }, [kind === "hero" ? "내 카드를 보며 선택하세요" : "보드 카드를 보며 선택하세요"]),
    h("div", { class: "scan-sub" }, ["카메라에 카드를 비추고, 아래 그리드에서 같은 카드를 눌러 채워주세요"]),
  ]);

  const video = h("video", { class: "scan-video", autoplay: true, playsinline: true, muted: true }) as HTMLVideoElement;
  const guideOverlay = h("div", { class: "scan-guides" });
  const guideEls: HTMLElement[] = [];
  for (let i = 0; i < slotCount; i++) {
    const guide = h("div", { class: "guide" }, [h("span", { class: "guide-num" }, [String(i + 1)])]);
    guideEls.push(guide);
    guideOverlay.append(guide);
  }
  const videoWrap = h("div", { class: "scan-video-wrap" }, [video, guideOverlay]);
  const cameraStatus = h("div", { class: "camera-status" });

  const pickerHost = h("div", { class: "scan-picker-host" });
  const bottom = h("div", { class: "scan-bottom" });
  const cancelBtn = h("button", { class: "outline-btn small", type: "button" }, ["취소"]);
  const doneBtn = h("button", { class: "btn btn-solid small", type: "button", disabled: true }, ["완료"]);
  bottom.append(cancelBtn, doneBtn);

  screen.append(top, videoWrap, cameraStatus, pickerHost, bottom);
  root.append(screen);

  function updateGuides() {
    guideEls.forEach((guide, i) => {
      guide.classList.toggle("active", i === currentIndex);
      const oldLabel = guide.querySelector(".guide-card");
      if (oldLabel) oldLabel.remove();
      const c = localCards[i];
      if (c) {
        guide.append(
          h("span", { class: "guide-card" + (isRedSuit(c.suit) ? " red" : " blk") }, [
            `${rankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`,
          ]),
        );
      }
    });
  }

  function updateDoneState() {
    doneBtn.toggleAttribute("disabled", localCards.some((c) => c === null));
  }

  function refreshPicker() {
    pickerHost.innerHTML = "";
    const otherUsed =
      kind === "hero"
        ? activeBoardCards(state).filter((c): c is Card => c !== null)
        : state.heroCards.filter((c): c is Card => c !== null);
    const sessionUsed = localCards.filter((c): c is Card => c !== null);
    const disabled = [...otherUsed, ...sessionUsed];
    pickerHost.append(
      cardPickerGrid(disabled, (card) => {
        localCards[currentIndex] = card;
        const nextEmpty = localCards.findIndex((c) => c === null);
        currentIndex = nextEmpty === -1 ? currentIndex : nextEmpty;
        updateGuides();
        updateDoneState();
        refreshPicker();
      }),
    );
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraStatus.textContent = "이 브라우저에서는 카메라를 사용할 수 없습니다. 아래에서 바로 카드를 선택하세요.";
      cameraStatus.classList.add("visible");
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
    } catch {
      cameraStatus.textContent = "카메라 권한이 없어 미리보기를 표시할 수 없습니다. 아래에서 바로 카드를 선택하세요.";
      cameraStatus.classList.add("visible");
    }
  }

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

  refreshPicker();
  updateGuides();
  updateDoneState();
  void startCamera();
}
