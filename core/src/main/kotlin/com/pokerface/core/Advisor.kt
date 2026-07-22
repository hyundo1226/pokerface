package com.pokerface.core

import java.util.Locale
import kotlin.random.Random

enum class Action(val koreanLabel: String) {
    FOLD("다이 (폴드)"),
    CHECK("체크"),
    CALL("콜"),
    RAISE("레이즈"),
    ALL_IN("올인"),
}

data class Advice(
    val action: Action,
    val equity: Double,
    val requiredEquity: Double?,
    val callEv: Double?,
    val reasons: List<String>,
    val handDescription: String,
    val equityResult: EquityResult,
)

/**
 * 헤즈업(둘이서) 텍사스 홀덤 기준으로, 현재 승률과 팟 오즈를 비교해
 * 폴드/체크/콜/레이즈/올인 중 무엇이 수학적으로 유리한지 추천하고 그 이유를 설명한다.
 *
 * 주의: 이 로직은 상대의 성향이나 블러프 가능성을 고려하지 않는 단순화된 EV(기댓값) 계산이다.
 * 초보자가 "팟 오즈"와 "승률"의 관계를 이해하도록 돕는 학습 도구를 목표로 한다.
 */
object Advisor {

    fun advise(
        heroHole: List<Card>,
        board: List<Card>,
        pot: Double,
        amountToCall: Double,
        heroStack: Double,
        trials: Int = 15_000,
        random: Random = Random(System.nanoTime()),
    ): Advice {
        require(heroHole.size == 2) { "홀 카드는 2장이어야 합니다" }
        require(pot >= 0 && amountToCall >= 0 && heroStack >= 0)

        val equityResult = EquityCalculator.estimate(heroHole, board, trials, random)
        val equity = equityResult.equity
        val handDescription = if (heroHole.size + board.size >= 5) {
            HandEvaluator.bestHand(heroHole + board).category.koreanLabel
        } else {
            "프리플랍"
        }

        if (amountToCall <= 0.0) {
            return adviseWithNothingToCall(equity, equityResult, handDescription)
        }

        val effectiveToCall = minOf(amountToCall, heroStack)
        val isAllInCall = amountToCall >= heroStack
        val requiredEquity = effectiveToCall / (pot + effectiveToCall)
        val margin = equity - requiredEquity
        val callEv = equity * (pot + effectiveToCall) - effectiveToCall

        val reasons = mutableListOf(
            "현재 팟은 ${fmt(pot)}, 콜 금액은 ${fmt(effectiveToCall)}입니다. " +
                "콜이 손해가 아니려면 최소 ${pct(requiredEquity)}%의 승률이 필요합니다 (팟 오즈).",
            "이번 핸드의 예측 승률(무승부는 절반으로 계산)은 약 ${pct(equity)}%입니다.",
        )

        val action = when {
            isAllInCall -> if (margin >= 0) Action.CALL else Action.FOLD
            margin < 0 -> Action.FOLD
            margin < 0.08 -> Action.CALL
            margin < 0.20 || equity < 0.65 -> Action.RAISE
            else -> Action.ALL_IN
        }

        reasons += when (action) {
            Action.FOLD -> "필요 승률(${pct(requiredEquity)}%)보다 예측 승률(${pct(equity)}%)이 낮습니다. " +
                "이 상황에서 계속 콜하면 장기적으로 손해이므로 다이(폴드)가 정답입니다."
            Action.CALL -> if (isAllInCall) {
                "이미 스택 대부분이 걸린 올인 콜 상황입니다. 승률이 필요 승률 이상이므로 콜하는 것이 유리합니다."
            } else {
                "필요 승률과 예측 승률의 차이가 크지 않습니다. 무리한 레이즈보다 콜로 다음 카드를 확인하는 것이 안전합니다."
            }
            Action.RAISE -> "예측 승률이 필요 승률보다 충분히 높습니다(여유분 ${pct(margin)}%p). " +
                "레이즈로 팟을 키우면 상대의 실수를 유도하고 기대 이득을 극대화할 수 있습니다."
            Action.ALL_IN -> "승률이 매우 높고 여유분도 커서(${pct(margin)}%p) 상대가 콜하더라도 크게 유리합니다. " +
                "올인으로 최대 이득을 노려볼 만한 상황입니다."
            Action.CHECK -> ""
        }

        return Advice(action, equity, requiredEquity, callEv, reasons, handDescription, equityResult)
    }

    private fun adviseWithNothingToCall(
        equity: Double,
        equityResult: EquityResult,
        handDescription: String,
    ): Advice {
        val reasons = mutableListOf(
            "콜해야 할 베팅이 없는 상황입니다 (체크 가능). 예측 승률은 약 ${pct(equity)}%입니다.",
        )
        val action = when {
            equity >= 0.70 -> Action.RAISE
            else -> Action.CHECK
        }
        reasons += when (action) {
            Action.RAISE -> "승률이 매우 높습니다. 공짜로 다음 카드를 보여주기보다 베팅(레이즈)해서 " +
                "상대에게서 가치를 뽑아내는 것이 좋습니다 (밸류 베팅)."
            else -> "승률이 아주 높지는 않습니다. 비용 없이 체크로 다음 카드를 확인하세요."
        }
        return Advice(action, equity, null, null, reasons, handDescription, equityResult)
    }

    private fun pct(x: Double): String = String.format(Locale.ROOT, "%.1f", x * 100)
    private fun fmt(x: Double): String = if (x == x.toLong().toDouble()) {
        x.toLong().toString()
    } else {
        String.format(Locale.ROOT, "%.2f", x)
    }
}
