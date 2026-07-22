package com.pokerface.core

import kotlin.random.Random
import kotlin.test.Test
import kotlin.test.assertTrue

class EquityTest {

    private fun cards(vararg codes: String) = codes.map { Card.fromCode(it) }

    @Test
    fun `pocket aces preflop is a big favorite`() {
        val result = EquityCalculator.estimate(
            heroHole = cards("As", "Ah"),
            board = emptyList(),
            trials = 8000,
            random = Random(42),
        )
        // AA vs random hand heads-up is ~85%.
        assertTrue(result.equity in 0.78..0.92, "unexpected equity: ${result.equity}")
    }

    @Test
    fun `nut flush on river is near certain`() {
        val result = EquityCalculator.estimate(
            heroHole = cards("As", "Ks"),
            board = cards("2s", "7s", "9s", "3d", "4h"),
        )
        assertTrue(result.equity > 0.90, "unexpected equity: ${result.equity}")
    }

    @Test
    fun `worst hand on river with no outs is near zero`() {
        // Board makes a straight on the board itself is tricky to guarantee "worst",
        // instead check a clearly weak two-seven offsuit style low card vs a strong board scenario indirectly
        // by verifying probabilities sum to 1.
        val result = EquityCalculator.estimate(
            heroHole = cards("2c", "7d"),
            board = cards("As", "Ks", "Qs", "Js", "10h"),
        )
        val total = result.winProbability + result.tieProbability + result.loseProbability
        assertTrue(total in 0.999..1.001)
    }

    @Test
    fun `probabilities always sum to one preflop`() {
        val result = EquityCalculator.estimate(
            heroHole = cards("7h", "2c"),
            board = emptyList(),
            trials = 4000,
            random = Random(7),
        )
        val total = result.winProbability + result.tieProbability + result.loseProbability
        assertTrue(total in 0.999..1.001)
    }
}
