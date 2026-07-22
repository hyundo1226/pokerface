package com.pokerface.core

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertEquals

class AdvisorTest {

    private fun cards(vararg codes: String) = codes.map { Card.fromCode(it) }

    @Test
    fun `nut hand on river with a bet facing us recommends all-in`() {
        val advice = Advisor.advise(
            heroHole = cards("As", "Ks"),
            board = cards("2s", "7s", "9s", "3d", "4h"),
            pot = 100.0,
            amountToCall = 20.0,
            heroStack = 500.0,
        )
        assertEquals(Action.ALL_IN, advice.action)
    }

    @Test
    fun `trash hand facing a big river bet recommends fold`() {
        val advice = Advisor.advise(
            heroHole = cards("2c", "7d"),
            board = cards("As", "Ks", "Qs", "Js", "10h"),
            pot = 100.0,
            amountToCall = 200.0,
            heroStack = 500.0,
        )
        assertEquals(Action.FOLD, advice.action)
    }

    @Test
    fun `nothing to call with strong equity suggests betting`() {
        val advice = Advisor.advise(
            heroHole = cards("As", "Ks"),
            board = cards("2s", "7s", "9s", "3d", "4h"),
            pot = 100.0,
            amountToCall = 0.0,
            heroStack = 500.0,
        )
        assertEquals(Action.RAISE, advice.action)
    }

    @Test
    fun `close decision with cheap call favors calling over folding`() {
        // Small bet into a big pot: required equity is low, so even a modest hand should call.
        val advice = Advisor.advise(
            heroHole = cards("9h", "9d"),
            board = cards("2s", "6d", "Jc"),
            pot = 200.0,
            amountToCall = 10.0,
            heroStack = 500.0,
            random = Random(1),
        )
        assert(advice.action == Action.CALL || advice.action == Action.RAISE || advice.action == Action.ALL_IN) {
            "expected a non-fold action, got ${advice.action}"
        }
    }
}
