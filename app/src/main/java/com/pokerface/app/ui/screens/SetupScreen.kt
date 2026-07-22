package com.pokerface.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import com.pokerface.app.PokerViewModel
import com.pokerface.app.Street
import com.pokerface.core.Card
import com.pokerface.app.ui.components.CardPickerGrid
import com.pokerface.app.ui.components.PlayingCardSlot
import com.pokerface.app.ui.components.SectionLabel

private sealed class SlotRef {
    data class Hero(val index: Int) : SlotRef()
    data class Board(val index: Int) : SlotRef()
}

@Composable
fun SetupScreen(
    viewModel: PokerViewModel,
    onNext: () -> Unit,
    onScanHero: () -> Unit,
    onScanBoard: () -> Unit,
) {
    val state by viewModel.uiState.collectAsState()
    var editingSlot by remember { mutableStateOf<SlotRef?>(null) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("스트리트를 선택하세요", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(8.dp))
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Street.entries.forEach { street ->
                FilterChip(
                    selected = state.street == street,
                    onClick = { viewModel.setStreet(street) },
                    label = { Text(street.koreanLabel) },
                )
            }
        }

        Spacer(Modifier.height(20.dp))
        SectionLabel("내 카드 (홀 카드 2장)")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            state.heroCards.forEachIndexed { index, card ->
                PlayingCardSlot(
                    card = card,
                    modifier = Modifier.weight(1f),
                    onClick = { editingSlot = SlotRef.Hero(index) },
                )
            }
        }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(onClick = onScanHero, modifier = Modifier.fillMaxWidth()) {
            Text("📷 카메라로 내 카드 스캔")
        }

        if (state.street != Street.PREFLOP) {
            Spacer(Modifier.height(20.dp))
            SectionLabel("보드 카드 (${state.street.koreanLabel})")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                for (index in 0 until state.street.boardCount) {
                    PlayingCardSlot(
                        card = state.boardCards[index],
                        modifier = Modifier.weight(1f),
                        onClick = { editingSlot = SlotRef.Board(index) },
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(onClick = onScanBoard, modifier = Modifier.fillMaxWidth()) {
                Text("📷 카메라로 보드 카드 스캔")
            }
        }

        if (state.hasDuplicates) {
            Spacer(Modifier.height(12.dp))
            Text(
                "⚠️ 같은 카드가 중복 선택되었습니다. 다시 확인해주세요.",
                color = MaterialTheme.colorScheme.error,
            )
        }

        Spacer(Modifier.height(24.dp))
        Button(
            onClick = onNext,
            enabled = state.isHeroComplete && state.isBoardComplete && !state.hasDuplicates,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("다음: 베팅 정보 입력")
        }
        Spacer(Modifier.height(24.dp))
    }

    editingSlot?.let { slot ->
        val currentCard = when (slot) {
            is SlotRef.Hero -> state.heroCards.getOrNull(slot.index)
            is SlotRef.Board -> state.boardCards.getOrNull(slot.index)
        }
        val disabled = state.usedCards - setOfNotNull(currentCard)

        Dialog(onDismissRequest = { editingSlot = null }) {
            Surface(shape = RoundedCornerShape(12.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Text("카드 선택", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(12.dp))
                    CardPickerGrid(
                        disabledCards = disabled,
                        onPick = { card: Card ->
                            when (slot) {
                                is SlotRef.Hero -> viewModel.setHeroCard(slot.index, card)
                                is SlotRef.Board -> viewModel.setBoardCard(slot.index, card)
                            }
                            editingSlot = null
                        },
                    )
                    Spacer(Modifier.height(8.dp))
                    TextButton(onClick = {
                        when (slot) {
                            is SlotRef.Hero -> viewModel.setHeroCard(slot.index, null)
                            is SlotRef.Board -> viewModel.setBoardCard(slot.index, null)
                        }
                        editingSlot = null
                    }) { Text("비우기") }
                }
            }
        }
    }
}
