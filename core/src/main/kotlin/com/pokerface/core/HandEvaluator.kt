package com.pokerface.core

/** 족보 카테고리. 숫자가 클수록 강하다. */
enum class HandCategory(val rank: Int, val koreanLabel: String) {
    HIGH_CARD(0, "하이 카드"),
    ONE_PAIR(1, "원 페어"),
    TWO_PAIR(2, "투 페어"),
    THREE_OF_A_KIND(3, "트리플"),
    STRAIGHT(4, "스트레이트"),
    FLUSH(5, "플러시"),
    FULL_HOUSE(6, "풀 하우스"),
    FOUR_OF_A_KIND(7, "포카드"),
    STRAIGHT_FLUSH(8, "스트레이트 플러시"),
}

/**
 * 5장짜리 족보의 평가 결과. [tiebreakers]는 족보가 같을 때 비교하는 카드 랭크값들로,
 * 앞쪽 원소일수록 더 중요하다 (예: 투 페어면 [높은 페어, 낮은 페어, 키커]).
 */
data class HandValue(
    val category: HandCategory,
    val tiebreakers: List<Int>,
    val bestFive: List<Card>,
) : Comparable<HandValue> {

    override fun compareTo(other: HandValue): Int {
        if (category.rank != other.category.rank) return category.rank - other.category.rank
        for (i in tiebreakers.indices) {
            val diff = tiebreakers[i] - other.tiebreakers.getOrElse(i) { 0 }
            if (diff != 0) return diff
        }
        return 0
    }
}

/** 2~7장의 카드 중 최고의 5장 조합(족보)을 찾아내는 평가기. */
object HandEvaluator {

    /** [cards]는 5장에서 7장 사이여야 한다 (홀 카드 + 보드). */
    fun bestHand(cards: List<Card>): HandValue {
        require(cards.size in 5..7) { "카드는 5~7장이어야 합니다 (현재 ${cards.size}장)" }
        if (cards.size == 5) return evaluateFive(cards)
        return combinations(cards, 5).map { evaluateFive(it) }.max()
    }

    private fun evaluateFive(cards: List<Card>): HandValue {
        require(cards.size == 5)
        val sortedDesc = cards.sortedByDescending { it.rank.value }
        val isFlush = cards.groupBy { it.suit }.values.any { it.size == 5 }

        val distinctRanksDesc = sortedDesc.map { it.rank.value }.distinct()
        val straightHigh = straightHighCard(distinctRanksDesc)
        val isStraight = straightHigh != null

        if (isFlush && isStraight) {
            return HandValue(HandCategory.STRAIGHT_FLUSH, listOf(straightHigh!!), sortedDesc)
        }

        val countsByRank = cards.groupBy { it.rank.value }.mapValues { it.value.size }
        // (개수, 랭크) 기준 내림차순: 개수가 같으면 높은 랭크가 먼저.
        val groups = countsByRank.entries.sortedWith(
            compareByDescending<Map.Entry<Int, Int>> { it.value }.thenByDescending { it.key }
        )

        return when {
            groups[0].value == 4 -> {
                val kicker = groups.first { it.value == 1 }.key
                HandValue(HandCategory.FOUR_OF_A_KIND, listOf(groups[0].key, kicker), sortedDesc)
            }
            groups[0].value == 3 && groups.size > 1 && groups[1].value >= 2 -> {
                HandValue(HandCategory.FULL_HOUSE, listOf(groups[0].key, groups[1].key), sortedDesc)
            }
            isFlush -> {
                HandValue(HandCategory.FLUSH, sortedDesc.map { it.rank.value }, sortedDesc)
            }
            isStraight -> {
                HandValue(HandCategory.STRAIGHT, listOf(straightHigh!!), sortedDesc)
            }
            groups[0].value == 3 -> {
                val kickers = groups.filter { it.value == 1 }.map { it.key }.sortedDescending()
                HandValue(HandCategory.THREE_OF_A_KIND, listOf(groups[0].key) + kickers, sortedDesc)
            }
            groups[0].value == 2 && groups.size > 1 && groups[1].value == 2 -> {
                val kicker = groups.first { it.value == 1 }.key
                HandValue(HandCategory.TWO_PAIR, listOf(groups[0].key, groups[1].key, kicker), sortedDesc)
            }
            groups[0].value == 2 -> {
                val kickers = groups.filter { it.value == 1 }.map { it.key }.sortedDescending()
                HandValue(HandCategory.ONE_PAIR, listOf(groups[0].key) + kickers, sortedDesc)
            }
            else -> {
                HandValue(HandCategory.HIGH_CARD, sortedDesc.map { it.rank.value }, sortedDesc)
            }
        }
    }

    /** 내림차순 distinct 랭크 목록에서 스트레이트가 있으면 가장 높은 카드 값을 반환한다. A-2-3-4-5(휠)도 처리한다. */
    private fun straightHighCard(distinctRanksDesc: List<Int>): Int? {
        if (distinctRanksDesc.size < 5) return null
        for (i in 0..distinctRanksDesc.size - 5) {
            val window = distinctRanksDesc.subList(i, i + 5)
            if (window[0] - window[4] == 4) return window[0]
        }
        // 휠: A,5,4,3,2
        val wheel = setOf(14, 5, 4, 3, 2)
        if (wheel.all { it in distinctRanksDesc }) return 5
        return null
    }

    private fun <T> combinations(items: List<T>, k: Int): List<List<T>> {
        if (k == 0) return listOf(emptyList())
        if (items.size < k) return emptyList()
        val result = mutableListOf<List<T>>()
        fun recurse(start: Int, current: MutableList<T>) {
            if (current.size == k) {
                result.add(current.toList())
                return
            }
            for (i in start until items.size) {
                current.add(items[i])
                recurse(i + 1, current)
                current.removeAt(current.size - 1)
            }
        }
        recurse(0, mutableListOf())
        return result
    }
}
