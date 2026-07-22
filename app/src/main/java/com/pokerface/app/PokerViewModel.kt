package com.pokerface.app

import androidx.compose.runtime.Immutable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pokerface.core.Advice
import com.pokerface.core.Advisor
import com.pokerface.core.Card
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class Street(val boardCount: Int, val koreanLabel: String) {
    PREFLOP(0, "프리플랍 (보드 없음)"),
    FLOP(3, "플랍 (3장)"),
    TURN(4, "턴 (4장)"),
    RIVER(5, "리버 (5장)"),
}

@Immutable
data class PokerUiState(
    val street: Street = Street.PREFLOP,
    val heroCards: List<Card?> = listOf(null, null),
    val boardCards: List<Card?> = listOf(null, null, null, null, null),
    val potText: String = "100",
    val toCallText: String = "20",
    val heroStackText: String = "500",
    val isCalculating: Boolean = false,
    val advice: Advice? = null,
    val errorMessage: String? = null,
) {
    val activeBoardCards: List<Card?> get() = boardCards.take(street.boardCount)

    val usedCards: Set<Card>
        get() = (heroCards + activeBoardCards).filterNotNull().toSet()

    val isHeroComplete: Boolean get() = heroCards.all { it != null }
    val isBoardComplete: Boolean get() = activeBoardCards.all { it != null }
    val hasDuplicates: Boolean
        get() {
            val known = heroCards.filterNotNull() + activeBoardCards.filterNotNull()
            return known.size != known.toSet().size
        }

    val canCalculate: Boolean get() = isHeroComplete && isBoardComplete && !hasDuplicates
}

class PokerViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(PokerUiState())
    val uiState: StateFlow<PokerUiState> = _uiState

    fun setStreet(street: Street) {
        _uiState.update { it.copy(street = street, advice = null, errorMessage = null) }
    }

    fun setHeroCard(index: Int, card: Card?) {
        _uiState.update {
            val updated = it.heroCards.toMutableList().also { list -> list[index] = card }
            it.copy(heroCards = updated, advice = null, errorMessage = null)
        }
    }

    fun setBoardCard(index: Int, card: Card?) {
        _uiState.update {
            val updated = it.boardCards.toMutableList().also { list -> list[index] = card }
            it.copy(boardCards = updated, advice = null, errorMessage = null)
        }
    }

    /** 카메라 인식 결과 등, 여러 장을 한 번에 반영할 때 사용한다. */
    fun setHeroCards(cards: List<Card?>) {
        _uiState.update { it.copy(heroCards = cards, advice = null, errorMessage = null) }
    }

    fun setBoardCards(cards: List<Card?>) {
        _uiState.update {
            val padded = (cards + List(5) { null }).take(5)
            it.copy(boardCards = padded, advice = null, errorMessage = null)
        }
    }

    fun setPotText(text: String) = _uiState.update { it.copy(potText = text, advice = null) }
    fun setToCallText(text: String) = _uiState.update { it.copy(toCallText = text, advice = null) }
    fun setHeroStackText(text: String) = _uiState.update { it.copy(heroStackText = text, advice = null) }

    fun calculateAdvice() {
        val state = _uiState.value
        if (!state.canCalculate) {
            _uiState.update {
                it.copy(
                    errorMessage = when {
                        !it.isHeroComplete -> "내 카드 2장을 모두 선택해주세요."
                        !it.isBoardComplete -> "보드 카드를 모두 선택해주세요."
                        it.hasDuplicates -> "같은 카드가 중복 선택되었습니다."
                        else -> "입력값을 확인해주세요."
                    },
                )
            }
            return
        }

        val pot = state.potText.toDoubleOrNull()
        val toCall = state.toCallText.toDoubleOrNull()
        val heroStack = state.heroStackText.toDoubleOrNull()
        if (pot == null || toCall == null || heroStack == null || pot < 0 || toCall < 0 || heroStack < 0) {
            _uiState.update { it.copy(errorMessage = "팟/베팅/스택 금액을 숫자로 올바르게 입력해주세요.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isCalculating = true, errorMessage = null) }
            val heroHole = state.heroCards.filterNotNull()
            val board = state.activeBoardCards.filterNotNull()
            val advice = withContext(Dispatchers.Default) {
                Advisor.advise(
                    heroHole = heroHole,
                    board = board,
                    pot = pot,
                    amountToCall = toCall,
                    heroStack = heroStack,
                )
            }
            _uiState.update { it.copy(isCalculating = false, advice = advice) }
        }
    }

    fun resetCards() {
        _uiState.update {
            it.copy(
                heroCards = listOf(null, null),
                boardCards = listOf(null, null, null, null, null),
                street = Street.PREFLOP,
                advice = null,
                errorMessage = null,
            )
        }
    }
}
