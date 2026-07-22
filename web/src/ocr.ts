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

/**
 * 카메라 프레임에서 실제로 OCR에 넘길 중앙 밴드 영역(가로/세로 비율).
 * 배경(바닥·천장·벽)을 잘라내 잡음을 줄이고, 이 안을 카드로 꽉 채우도록 유도한다.
 * 스캔 화면의 가이드 프레임도 같은 값을 써서 화면 안내와 실제 인식 영역을 일치시킨다.
 */
export const OCR_CROP_FRACTION = { x: 0.06, y: 0.2, w: 0.88, h: 0.58 };

/** Otsu 방법으로 히스토그램(길이 256)에서 전경/배경을 가르는 임계값을 구한다. */
export function otsuThreshold(hist: number[], total: number): number {
  if (total === 0) return 127;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxBetween = -1;
  let threshold = 127;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxBetween) {
      maxBetween = between;
      threshold = i;
    }
  }
  return threshold;
}

export interface Preprocessed {
  canvas: HTMLCanvasElement;
  /** 처리된 캔버스의 bbox를 원본 소스 캔버스 좌표로 되돌린다(색상 샘플링용). */
  mapBBoxToSource: (b: { x0: number; y0: number; x1: number; y1: number }) => {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * OCR 정확도를 위한 전처리: 중앙 밴드로 크롭 → 확대 → 그레이스케일 → Otsu 이진화.
 * 빨간 잉크(하트/다이아)도 휘도상 어둡게 잡히므로 글자로 살아남는다.
 * (색상 판별은 원본에서 따로 샘플링하므로 여기서 색을 잃어도 무방하다.)
 */
export function preprocessForOcr(source: HTMLCanvasElement, crop = OCR_CROP_FRACTION): Preprocessed {
  const sx = Math.round(crop.x * source.width);
  const sy = Math.round(crop.y * source.height);
  const sw = Math.max(1, Math.round(crop.w * source.width));
  const sh = Math.max(1, Math.round(crop.h * source.height));

  // 글자가 너무 작으면 OCR이 실패하므로 확대(과도한 확대는 속도 저하라 3배까지만).
  const scale = Math.min(3, Math.max(1, 1400 / sw));
  const outW = Math.round(sw * scale);
  const outH = Math.round(sh * scale);

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, outW, outH);

  const img = ctx.getImageData(0, 0, outW, outH);
  const { data } = img;
  const hist = new Array(256).fill(0);
  const gray = new Uint8ClampedArray(outW * outH);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // 휘도(빨강도 어둡게 잡히도록 표준 계수 사용)
    const g = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
    const gi = g | 0;
    gray[p] = gi;
    hist[gi]++;
  }
  const threshold = otsuThreshold(hist, outW * outH);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const v = gray[p] <= threshold ? 0 : 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  return {
    canvas: out,
    mapBBoxToSource: (b) => ({
      x0: sx + b.x0 / scale,
      y0: sy + b.y0 / scale,
      x1: sx + b.x1 / scale,
      y1: sy + b.y1 / scale,
    }),
  };
}

/** 같은 랭크가 비슷한 위치에서 여러 번(여러 PSM 패스) 잡히면 신뢰도 높은 것만 남긴다. */
function dedupeCandidates(
  cands: Omit<CardGuess, "isRed">[],
  imageWidth: number,
): Omit<CardGuess, "isRed">[] {
  const kept: Omit<CardGuess, "isRed">[] = [];
  const sameXThreshold = imageWidth * 0.08;
  for (const c of cands) {
    const cx = (c.bbox.x0 + c.bbox.x1) / 2;
    const dup = kept.find((k) => {
      const kx = (k.bbox.x0 + k.bbox.x1) / 2;
      return k.rank === c.rank && Math.abs(kx - cx) < sameXThreshold;
    });
    if (!dup) {
      kept.push(c);
    } else if (c.confidence > dup.confidence) {
      dup.confidence = c.confidence;
      dup.bbox = c.bbox;
    }
  }
  return kept;
}

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

/**
 * Tesseract.js 워커를 지연 로딩한다. 워커/언어 데이터는 첫 호출 시 CDN에서
 * 내려받으므로, 네트워크가 없으면 예외를 던진다(호출부에서 수동 입력으로 폴백).
 */
async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({ tessedit_char_whitelist: "0123456789AJQKT" });
      return worker;
    })();
  }
  return workerPromise;
}

async function recognizeWords(
  canvas: HTMLCanvasElement,
  psm: import("tesseract.js").PSM,
): Promise<OcrWord[]> {
  const worker = await getWorker();
  await worker.setParameters({ tessedit_pageseg_mode: psm });
  const { data } = await worker.recognize(canvas);
  return (data.words ?? []).map((w) => ({
    text: w.text,
    confidence: w.confidence,
    bbox: { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
  }));
}

/**
 * 캔버스(카메라 정지 프레임) 하나에서 최대 [maxCards]장의 카드 랭크·색상을 자동 인식한다.
 * 전처리(크롭·확대·이진화) 후 두 가지 PSM 모드로 인식해 합치고 중복을 제거한다.
 * 인식 결과는 추정값이며, 항상 사용자가 확인·수정하는 것을 전제로 한다.
 */
export async function recognizeCards(canvas: HTMLCanvasElement, maxCards: number): Promise<CardGuess[]> {
  const pre = preprocessForOcr(canvas);
  const { PSM } = await import("tesseract.js");

  const passes = await Promise.all([
    recognizeWords(pre.canvas, PSM.SPARSE_TEXT),
    recognizeWords(pre.canvas, PSM.SINGLE_BLOCK),
  ]);
  const merged = passes.flat();
  const all = extractRankCandidates(merged, merged.length);
  const ranked = dedupeCandidates(all, pre.canvas.width).slice(0, maxCards);

  // 색상 판별은 이진화되지 않은 원본에서 샘플링한다.
  const srcCtx = canvas.getContext("2d");
  const srcImage = srcCtx?.getImageData(0, 0, canvas.width, canvas.height) ?? null;

  return ranked.map((cand) => ({
    ...cand,
    isRed: srcImage ? isRedInkAt(srcImage, pre.mapBBoxToSource(cand.bbox)) : false,
  }));
}
