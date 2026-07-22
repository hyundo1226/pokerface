package com.pokerface.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pokerface.app.ui.theme.PokerBlack
import com.pokerface.app.ui.theme.PokerCream
import com.pokerface.app.ui.theme.PokerGold
import com.pokerface.app.ui.theme.PokerRed
import com.pokerface.core.Card
import com.pokerface.core.Rank
import com.pokerface.core.Suit

/** 카드 한 장을 트럼프 카드처럼 보여주는 슬롯. 비어있으면 + 아이콘을 표시한다. */
@Composable
fun PlayingCardSlot(
    card: Card?,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .aspectRatio(0.7f)
            .background(
                color = if (card != null) PokerCream else PokerCream.copy(alpha = 0.15f),
                shape = RoundedCornerShape(8.dp),
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (card == null) {
            Icon(Icons.Filled.Add, contentDescription = "카드 선택", tint = PokerGold)
        } else {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = card.rank.label,
                    color = if (card.suit.isRed) PokerRed else PokerBlack,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                )
                Text(
                    text = card.suit.symbol,
                    color = if (card.suit.isRed) PokerRed else PokerBlack,
                    fontSize = 18.sp,
                )
            }
        }
    }
}

/** 랭크 13 x 무늬 4 그리드로 카드를 고르는 선택기. [disabledCards]는 이미 다른 슬롯에서 쓰인 카드. */
@Composable
fun CardPickerGrid(
    disabledCards: Set<Card>,
    onPick: (Card) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        for (suit in Suit.entries) {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = suit.symbol,
                    color = if (suit.isRed) PokerRed else PokerBlack,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    modifier = Modifier.size(24.dp),
                )
                for (rank in Rank.entries.reversed()) {
                    val card = Card(rank, suit)
                    val disabled = card in disabledCards
                    Box(
                        modifier = Modifier
                            .size(30.dp)
                            .background(
                                color = if (disabled) Color.Gray.copy(alpha = 0.3f) else PokerCream,
                                shape = RoundedCornerShape(4.dp),
                            )
                            .then(
                                if (!disabled) Modifier.clickable { onPick(card) } else Modifier,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = rank.label,
                            fontSize = 11.sp,
                            color = if (disabled) Color.DarkGray else if (suit.isRed) PokerRed else PokerBlack,
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun SectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelLarge,
        color = PokerGold,
        modifier = modifier.padding(bottom = 4.dp),
    )
}
