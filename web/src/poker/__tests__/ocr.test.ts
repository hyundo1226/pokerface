import { describe, expect, it } from "vitest";
import { extractRankCandidates, isRedInkAt, normalizeRankToken, otsuThreshold, OcrWord } from "../../ocr";
import { Rank } from "../card";

const word = (text: string, x0: number, confidence = 90): OcrWord => ({
  text,
  confidence,
  bbox: { x0, y0: 0, x1: x0 + 20, y1: 30 },
});

describe("normalizeRankToken", () => {
  it("maps face cards and ten", () => {
    expect(normalizeRankToken("A")).toBe(Rank.ACE);
    expect(normalizeRankToken("K")).toBe(Rank.KING);
    expect(normalizeRankToken("Q")).toBe(Rank.QUEEN);
    expect(normalizeRankToken("J")).toBe(Rank.JACK);
    expect(normalizeRankToken("10")).toBe(Rank.TEN);
    expect(normalizeRankToken("T")).toBe(Rank.TEN);
  });

  it("maps number cards and strips noise", () => {
    expect(normalizeRankToken(" 9 ")).toBe(Rank.NINE);
    expect(normalizeRankToken("q♥")).toBe(Rank.QUEEN);
    expect(normalizeRankToken("A♠")).toBe(Rank.ACE);
  });

  it("rejects non-card tokens", () => {
    expect(normalizeRankToken("")).toBeNull();
    expect(normalizeRankToken("1")).toBeNull();
    expect(normalizeRankToken("XZ")).toBeNull();
    expect(normalizeRankToken("0")).toBeNull();
  });
});

describe("extractRankCandidates", () => {
  it("keeps only valid ranks, ordered left to right, capped at maxCards", () => {
    const words = [word("K", 200), word("garbage", 50), word("A", 10), word("7", 120)];
    const result = extractRankCandidates(words, 2);
    expect(result.map((r) => r.rank)).toEqual([Rank.ACE, Rank.SEVEN]);
  });

  it("drops low-confidence words", () => {
    const words = [word("A", 10, 90), word("K", 60, 10)];
    const result = extractRankCandidates(words, 5);
    expect(result.map((r) => r.rank)).toEqual([Rank.ACE]);
  });
});

describe("otsuThreshold", () => {
  it("separates a clean bimodal histogram between the two peaks", () => {
    const hist = new Array(256).fill(0);
    hist[50] = 1000; // 어두운 전경(글자)
    hist[200] = 1000; // 밝은 배경(카드)
    const t = otsuThreshold(hist, 2000);
    // 임계값 이하는 전경(글자), 초과는 배경으로 갈려야 한다: [50, 200) 구간이면 올바른 분리.
    expect(t).toBeGreaterThanOrEqual(50);
    expect(t).toBeLessThan(200);
  });

  it("returns a safe default for an empty histogram", () => {
    expect(otsuThreshold(new Array(256).fill(0), 0)).toBe(127);
  });
});

describe("isRedInkAt", () => {
  function solidImage(r: number, g: number, b: number, w = 10, h = 10): ImageData {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = r;
      data[i * 4 + 1] = g;
      data[i * 4 + 2] = b;
      data[i * 4 + 3] = 255;
    }
    return { data, width: w, height: h, colorSpace: "srgb" } as ImageData;
  }

  it("detects red ink", () => {
    const img = solidImage(200, 20, 20);
    expect(isRedInkAt(img, { x0: 0, y0: 0, x1: 10, y1: 10 })).toBe(true);
  });

  it("treats black ink as not red", () => {
    const img = solidImage(20, 20, 20);
    expect(isRedInkAt(img, { x0: 0, y0: 0, x1: 10, y1: 10 })).toBe(false);
  });

  it("treats white background as not red", () => {
    const img = solidImage(250, 250, 250);
    expect(isRedInkAt(img, { x0: 0, y0: 0, x1: 10, y1: 10 })).toBe(false);
  });
});
