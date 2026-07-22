package com.pokerface.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class HandEvaluatorTest {

    private fun cards(vararg codes: String) = codes.map { Card.fromCode(it) }

    @Test
    fun `royal flush beats everything`() {
        val hand = HandEvaluator.bestHand(cards("As", "Ks", "Qs", "Js", "10s"))
        assertEquals(HandCategory.STRAIGHT_FLUSH, hand.category)
        assertEquals(14, hand.tiebreakers[0])
    }

    @Test
    fun `wheel straight A2345 is five high`() {
        val hand = HandEvaluator.bestHand(cards("As", "2h", "3d", "4c", "5s"))
        assertEquals(HandCategory.STRAIGHT, hand.category)
        assertEquals(5, hand.tiebreakers[0])
    }

    @Test
    fun `four of a kind beats full house`() {
        val quads = HandEvaluator.bestHand(cards("9s", "9h", "9d", "9c", "2s"))
        val fullHouse = HandEvaluator.bestHand(cards("Ks", "Kh", "Kd", "2c", "2s"))
        assertTrue(quads > fullHouse)
        assertEquals(HandCategory.FOUR_OF_A_KIND, quads.category)
        assertEquals(HandCategory.FULL_HOUSE, fullHouse.category)
    }

    @Test
    fun `flush beats straight`() {
        val flush = HandEvaluator.bestHand(cards("2s", "5s", "9s", "Js", "Ks"))
        val straight = HandEvaluator.bestHand(cards("4h", "5d", "6c", "7s", "8h"))
        assertTrue(flush > straight)
    }

    @Test
    fun `best five of seven is selected`() {
        // 7 cards: hero has trip aces available among the 7.
        val hand = HandEvaluator.bestHand(
            cards("As", "Ah", "Ad", "2c", "3s", "7h", "9d"),
        )
        assertEquals(HandCategory.THREE_OF_A_KIND, hand.category)
        assertEquals(14, hand.tiebreakers[0])
    }

    @Test
    fun `two pair kicker breaks tie`() {
        val betterKicker = HandEvaluator.bestHand(cards("Ks", "Kh", "5d", "5c", "As", "2h", "3d"))
        val worseKicker = HandEvaluator.bestHand(cards("Ks", "Kh", "5d", "5c", "9s", "2h", "3d"))
        assertTrue(betterKicker > worseKicker)
        assertEquals(HandCategory.TWO_PAIR, betterKicker.category)
    }

    @Test
    fun `card fromCode and toCode round trip`() {
        val c = Card.fromCode("10d")
        assertEquals(Rank.TEN, c.rank)
        assertEquals(Suit.DIAMONDS, c.suit)
        assertEquals("10d", c.toCode())
    }
}
