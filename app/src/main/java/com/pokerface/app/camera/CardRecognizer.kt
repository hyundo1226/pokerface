package com.pokerface.app.camera

import android.graphics.Bitmap
import android.graphics.Color
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.pokerface.core.Rank
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.math.max

/**
 * 카드 한 장을 찍은 사진(코너 영역)에서 랭크(A,2~10,J,Q,K)를 온디바이스 OCR로 추정하고,
 * 잉크 색상으로 빨강/검정 무늬 후보를 좁혀준다.
 *
 * 한계: ♠♥♦♣ 기호 자체는 표준 라틴 OCR로 신뢰성 있게 구분하기 어렵기 때문에,
 * 무늬는 색상만으로 2개 후보로 좁히고 최종 선택은 사용자가 확인 화면에서 직접 고르도록 한다.
 * 즉, 이 결과는 "추정값"이며 항상 [CardReviewScreen] 등에서 사람이 확인/수정하는 것을 전제로 한다.
 */
object CardRecognizer {

    data class Guess(val rank: Rank?, val isRed: Boolean)

    private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

    suspend fun recognize(bitmap: Bitmap): Guess {
        val rank = runCatching { recognizeRank(bitmap) }.getOrNull()
        val isRed = detectIsRed(bitmap)
        return Guess(rank, isRed)
    }

    private suspend fun recognizeRank(bitmap: Bitmap): Rank? = suspendCancellableCoroutine { cont ->
        val image = InputImage.fromBitmap(bitmap, 0)
        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val guess = visionText.textBlocks.asSequence()
                    .flatMap { it.lines }
                    .mapNotNull { line -> normalizeRankToken(line.text) }
                    .firstOrNull()
                if (cont.isActive) cont.resume(guess)
            }
            .addOnFailureListener {
                if (cont.isActive) cont.resume(null)
            }
    }

    /** 배경(흰색)이 아닌 픽셀들의 평균 색상을 보고 빨간 잉크인지 판단한다. */
    private fun detectIsRed(bitmap: Bitmap): Boolean {
        val stepX = max(1, bitmap.width / 40)
        val stepY = max(1, bitmap.height / 40)
        var redVotes = 0
        var inkPixels = 0
        var x = 0
        while (x < bitmap.width) {
            var y = 0
            while (y < bitmap.height) {
                val px = bitmap.getPixel(x, y)
                val r = Color.red(px)
                val g = Color.green(px)
                val b = Color.blue(px)
                val brightness = (r + g + b) / 3
                if (brightness < 200) { // 흰 배경이 아닌(잉크) 픽셀만 집계
                    inkPixels++
                    if (r - max(g, b) > 40) redVotes++
                }
                y += stepY
            }
            x += stepX
        }
        if (inkPixels == 0) return false
        return redVotes.toDouble() / inkPixels > 0.35
    }

    internal fun normalizeRankToken(rawText: String): Rank? {
        val cleaned = rawText.trim().uppercase().filter { it.isLetterOrDigit() }
        if (cleaned.isEmpty() || cleaned.length > 2) return null
        return when (cleaned) {
            "A" -> Rank.ACE
            "K" -> Rank.KING
            "Q" -> Rank.QUEEN
            "J" -> Rank.JACK
            "10", "T" -> Rank.TEN
            "9" -> Rank.NINE
            "8" -> Rank.EIGHT
            "7" -> Rank.SEVEN
            "6" -> Rank.SIX
            "5" -> Rank.FIVE
            "4" -> Rank.FOUR
            "3" -> Rank.THREE
            "2" -> Rank.TWO
            else -> null
        }
    }
}
