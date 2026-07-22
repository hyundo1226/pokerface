package com.pokerface.core

import kotlin.random.Random

data class EquityResult(
    val winProbability: Double,
    val tieProbability: Double,
    val loseProbability: Double,
    val trials: Int,
) {
    /** 무승부를 절반의 승리로 환산한 실질 승률 (팟 오즈 비교에 사용). */
    val equity: Double get() = winProbability + tieProbability / 2.0
}

/**
 * 둘이서(헤즈업) 플레이 시, 상대 홀카드는 알 수 없다고 가정하고
 * 남은 덱에서 균등 무작위로 뽑는다는 전제로 승률을 추정한다.
 *
 * 리버(보드 5장 완성)에서는 상대 홀카드 조합을 전수 계산해 정확한 승률을 낸다.
 * 그 이전 스트리트에서는 몬테카를로 시뮬레이션으로 추정한다.
 */
object EquityCalculator {

    fun estimate(
        heroHole: List<Card>,
        board: List<Card>,
        trials: Int = 15_000,
        random: Random = Random(System.nanoTime()),
    ): EquityResult {
        require(heroHole.size == 2) { "홀 카드는 2장이어야 합니다" }
        require(board.size in 0..5) { "보드는 0~5장이어야 합니다" }

        val known = heroHole + board
        val deck = Deck.remaining(known)
        val boardNeeded = 5 - board.size

        return if (boardNeeded == 0) {
            exactRiverEquity(heroHole, board, deck)
        } else {
            monteCarloEquity(heroHole, board, deck, boardNeeded, trials, random)
        }
    }

    private fun exactRiverEquity(heroHole: List<Card>, board: List<Card>, deck: List<Card>): EquityResult {
        val heroValue = HandEvaluator.bestHand(heroHole + board)
        var win = 0
        var tie = 0
        var lose = 0
        for (i in deck.indices) {
            for (j in i + 1 until deck.size) {
                val villainValue = HandEvaluator.bestHand(listOf(deck[i], deck[j]) + board)
                when {
                    heroValue > villainValue -> win++
                    heroValue.compareTo(villainValue) == 0 -> tie++
                    else -> lose++
                }
            }
        }
        val total = win + tie + lose
        return EquityResult(win.toDouble() / total, tie.toDouble() / total, lose.toDouble() / total, total)
    }

    private fun monteCarloEquity(
        heroHole: List<Card>,
        board: List<Card>,
        deck: List<Card>,
        boardNeeded: Int,
        trials: Int,
        random: Random,
    ): EquityResult {
        val pool = deck.toMutableList()
        val drawCount = 2 + boardNeeded
        var win = 0
        var tie = 0
        var lose = 0

        repeat(trials) {
            partialShuffle(pool, drawCount, random)
            val villainHole = listOf(pool[0], pool[1])
            val fullBoard = if (boardNeeded > 0) board + pool.subList(2, 2 + boardNeeded) else board

            val heroValue = HandEvaluator.bestHand(heroHole + fullBoard)
            val villainValue = HandEvaluator.bestHand(villainHole + fullBoard)
            val cmp = heroValue.compareTo(villainValue)
            when {
                cmp > 0 -> win++
                cmp == 0 -> tie++
                else -> lose++
            }
        }

        return EquityResult(win.toDouble() / trials, tie.toDouble() / trials, lose.toDouble() / trials, trials)
    }

    /** [list]의 앞 [count]개 위치를 무작위 표본으로 채우는 부분 피셔-예이츠 셔플. */
    private fun <T> partialShuffle(list: MutableList<T>, count: Int, random: Random) {
        for (i in 0 until count) {
            val j = i + random.nextInt(list.size - i)
            val tmp = list[i]
            list[i] = list[j]
            list[j] = tmp
        }
    }
}
