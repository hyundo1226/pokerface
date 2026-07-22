import { Rank } from "./poker/card";

/** OCR가 반환한 단어 하나. bbox는 원본 캔버스 픽셀 좌표계 기준. */
export interface OcrWord {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface CardGuess {
  rank: Rank;
  isRed: boolean;
  /** 이 추정의 신뢰도(0~100). 정렬/상위 선택에 사용. */
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

/**
 * OCR 텍스트 토큰 하나를 랭크로 정규화한다. 카드가 아니면 null.
 * 카드의 코너 인덱스는 1글자(A,K,Q,J,T,2~9)이거나 "10"(2글자)뿐이므로,
 * 무늬 기호 등 노이즈를 제거한 뒤 그 형태에 정확히 맞을 때만 인정한다.
 */
export function normalizeRankToken(raw: string): Rank | null {
  const cleaned = raw.trim().toUpperCase().replace(/[^0-9AJQKT]/g, "");
  if (cleaned.length === 0) return null;
  if (cleaned.length === 2) return cleaned === "10" ? Rank.TEN : null;
  if (cleaned.length > 2) return null;
  switch (cleaned) {
    case "A": return Rank.ACE;
    case "K": return Rank.KING;
    case "Q": return Rank.QUEEN;
    case "J": return Rank.JACK;
    case "T": return Rank.TEN;
    case "9": return Rank.NINE;
    case "8": return Rank.EIGHT;
    case "7": return Rank.SEVEN;
    case "6": return Rank.SIX;
    case "5": return Rank.FIVE;
    case "4": return Rank.FOUR;
    case "3": return Rank.THREE;
    case "2": return Rank.TWO;
    default: return null; // 단독 "1", "0" 등
  }
}

/**
 * OCR 단어 목록에서 카드 랭크 후보들을 뽑아낸다.
 * - 유효한 랭크로 정규화되는 단어만 남기고
 * - 화면상 위치(왼쪽→오른쪽, 그 다음 위→아래) 순으로 정렬해
 * - 최대 [maxCards]개까지 반환한다.
 *
 * 색상 판별(isRed)은 호출부에서 픽셀을 샘플링해 채워 넣는다(여기서는 false로 둔다).
 */
export function extractRankCandidates(words: OcrWord[], maxCards: number): Omit<CardGuess, "isRed">[] {
  const candidates: Omit<CardGuess, "isRed">[] = [];
  for (const w of words) {
    const rank = normalizeRankToken(w.text);
    if (rank === null) continue;
    if (w.confidence < 30) continue; // 신뢰도 너무 낮은 건 노이즈로 간주
    candidates.push({ rank, confidence: w.confidence, bbox: w.bbox });
  }
  // 부채꼴로 펼친 카드는 대체로 가로로 늘어서므로, 왼쪽→오른쪽 순으로 정렬.
  candidates.sort((a, b) => {
    const dx = a.bbox.x0 - b.bbox.x0;
    if (Math.abs(dx) > 12) return dx;
    return a.bbox.y0 - b.bbox.y0;
  });
  return candidates.slice(0, maxCards);
}

/** bbox 영역의 픽셀을 훑어 빨간 잉크(하트/다이아)인지 추정한다. */
export function isRedInkAt(image: ImageData, bbox: { x0: number; y0: number; x1: number; y1: number }): boolean {
  const { data, width, height } = image;
  const x0 = Math.max(0, Math.floor(bbox.x0));
  const y0 = Math.max(0, Math.floor(bbox.y0));
  const x1 = Math.min(width, Math.ceil(bbox.x1));
  const y1 = Math.min(height, Math.ceil(bbox.y1));
  let redVotes = 0;
  let inkPixels = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const brightness = (r + g + b) / 3;
      if (brightness < 200) {
        inkPixels++;
        if (r - Math.max(g, b) > 40) redVotes++;
      }
    }
  }
  if (inkPixels === 0) return false;
  return redVotes / inkPixels > 0.35;
}

type RecognizeFn = (canvas: HTMLCanvasElement) => Promise<OcrWord[]>;

let cachedRecognize: RecognizeFn | null = null;

/**
 * Tesseract.js 워커를 지연 로딩해 캔버스에서 단어 목록을 인식한다.
 * 워커/언어 데이터는 첫 호출 시 CDN에서 내려받으므로, 네트워크가 없으면 예외를 던진다.
 * (호출부에서 try/catch로 감싸 수동 입력으로 폴백한다.)
 */
async function getRecognizer(): Promise<RecognizeFn> {
  if (cachedRecognize) return cachedRecognize;
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  await worker.setParameters({
    tessedit_char_whitelist: "0123456789AJQKT",
    tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  });
  cachedRecognize = async (canvas: HTMLCanvasElement) => {
    const { data } = await worker.recognize(canvas);
    return (data.words ?? []).map((w) => ({
      text: w.text,
      confidence: w.confidence,
      bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
    }));
  };
  return cachedRecognize;
}

/**
 * 캔버스(카메라 정지 프레임) 하나에서 최대 [maxCards]장의 카드 랭크·색상을 자동 인식한다.
 * 인식 결과는 추정값이며, 항상 사용자가 확인·수정하는 것을 전제로 한다.
 */
export async function recognizeCards(canvas: HTMLCanvasElement, maxCards: number): Promise<CardGuess[]> {
  const recognize = await getRecognizer();
  const words = await recognize(canvas);
  const ranked = extractRankCandidates(words, maxCards);

  const ctx = canvas.getContext("2d");
  const image = ctx?.getImageData(0, 0, canvas.width, canvas.height) ?? null;

  return ranked.map((cand) => ({
    ...cand,
    isRed: image ? isRedInkAt(image, cand.bbox) : false,
  }));
}
