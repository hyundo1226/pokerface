package com.pokerface.core

object Deck {

    val fullDeck: List<Card> = buildList {
        for (suit in Suit.entries) {
            for (rank in Rank.entries) {
                add(Card(rank, suit))
            }
        }
    }

    /** 이미 사용된 카드를 제외한 나머지 카드를 반환한다. */
    fun remaining(used: Collection<Card>): List<Card> {
        val usedSet = used.toHashSet()
        return fullDeck.filter { it !in usedSet }
    }
}
