package com.pokerface.core

enum class Suit(val symbol: String, val label: String) {
    SPADES("♠", "스페이드"),
    HEARTS("♥", "하트"),
    DIAMONDS("♦", "다이아"),
    CLUBS("♣", "클럽");

    val isRed: Boolean get() = this == HEARTS || this == DIAMONDS

    companion object {
        fun fromChar(c: Char): Suit = when (c.lowercaseChar()) {
            's' -> SPADES
            'h' -> HEARTS
            'd' -> DIAMONDS
            'c' -> CLUBS
            else -> throw IllegalArgumentException("알 수 없는 무늬 문자: $c")
        }
    }
}

enum class Rank(val value: Int, val label: String) {
    TWO(2, "2"), THREE(3, "3"), FOUR(4, "4"), FIVE(5, "5"), SIX(6, "6"),
    SEVEN(7, "7"), EIGHT(8, "8"), NINE(9, "9"), TEN(10, "10"),
    JACK(11, "J"), QUEEN(12, "Q"), KING(13, "K"), ACE(14, "A");

    companion object {
        fun fromChar(c: Char): Rank = when (c.uppercaseChar()) {
            '2' -> TWO; '3' -> THREE; '4' -> FOUR; '5' -> FIVE; '6' -> SIX
            '7' -> SEVEN; '8' -> EIGHT; '9' -> NINE; 'T' -> TEN
            'J' -> JACK; 'Q' -> QUEEN; 'K' -> KING; 'A' -> ACE
            else -> throw IllegalArgumentException("알 수 없는 랭크 문자: $c")
        }

        fun fromLabel(label: String): Rank = when (label.uppercase()) {
            "10", "T" -> TEN
            else -> fromChar(label[0])
        }
    }
}

data class Card(val rank: Rank, val suit: Suit) : Comparable<Card> {

    override fun compareTo(other: Card): Int = rank.value - other.rank.value

    override fun toString(): String = "${rank.label}${suit.symbol}"

    /** 예: "As", "Td", "9h", "10c" */
    fun toCode(): String = "${rank.label}${suit.name.first().lowercaseChar()}"

    companion object {
        /** "As" / "Td" / "9h" / "10c" 같은 표기를 파싱한다. */
        fun fromCode(code: String): Card {
            val trimmed = code.trim()
            require(trimmed.length in 2..3) { "잘못된 카드 코드: $code" }
            val rankPart = trimmed.dropLast(1)
            val suitChar = trimmed.last()
            return Card(Rank.fromLabel(rankPart), Suit.fromChar(suitChar))
        }
    }
}
