package com.pokerface.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pokerface.app.PokerViewModel
import com.pokerface.app.ui.theme.PokerBlack
import com.pokerface.app.ui.theme.PokerGold
import com.pokerface.app.ui.theme.PokerGreenLight
import com.pokerface.app.ui.theme.PokerRed
import com.pokerface.core.Action
import com.pokerface.core.Advice
import java.util.Locale

@Composable
fun ResultScreen(
    viewModel: PokerViewModel,
    onBack: () -> Unit,
    onLearn: () -> Unit,
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        when {
            state.errorMessage != null -> {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Text("입력값을 확인해주세요", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    Text(state.errorMessage ?: "", color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = onBack) { Text("돌아가기") }
                }
            }
            state.isCalculating || state.advice == null -> {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator(color = PokerGold)
                    Spacer(Modifier.height(12.dp))
                    Text("수천 번의 가상 대결로 승률을 계산하고 있어요...")
                }
            }
            else -> {
                val advice = state.advice!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState()),
                ) {
                    ActionBadge(advice.action)
                    Spacer(Modifier.height(16.dp))
                    EquityBar(advice)
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "예측 승률 ${pct(advice.equity)}%" +
                            (advice.requiredEquity?.let { "  ·  필요 승률(팟 오즈) ${pct(it)}%" } ?: ""),
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        "핸드: ${advice.handDescription}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = PokerGold,
                    )

                    Spacer(Modifier.height(20.dp))
                    Text("왜 이 선택이 좋을까요?", style = MaterialTheme.typography.titleLarge)
                    Spacer(Modifier.height(8.dp))
                    advice.reasons.filter { it.isNotBlank() }.forEach { reason ->
                        Text("• $reason", modifier = Modifier.padding(vertical = 4.dp))
                    }

                    Spacer(Modifier.height(28.dp))
                    Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                        Text("새 핸드 분석하기")
                    }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(onClick = onLearn, modifier = Modifier.fillMaxWidth()) {
                        Text("팟 오즈 · 승률 개념 배우기")
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun ActionBadge(action: Action) {
    val color = when (action) {
        Action.FOLD -> PokerBlack
        Action.CHECK -> PokerGreenLight
        Action.CALL -> PokerGreenLight
        Action.RAISE -> PokerGold
        Action.ALL_IN -> PokerRed
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(72.dp)
            .background(color, RoundedCornerShape(12.dp)),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            action.koreanLabel,
            color = if (action == Action.RAISE) PokerBlack else Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 28.sp,
        )
    }
}

@Composable
private fun EquityBar(advice: Advice) {
    val result = advice.equityResult
    Column {
        Text("승 / 무 / 패", style = MaterialTheme.typography.labelLarge)
        Spacer(Modifier.height(4.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(20.dp)
                .background(Color.DarkGray, RoundedCornerShape(4.dp)),
        ) {
            EquityBarSegments(win = result.winProbability, tie = result.tieProbability, lose = result.loseProbability)
        }
        Text(
            "승 ${pct(result.winProbability)}%  ·  무 ${pct(result.tieProbability)}%  ·  패 ${pct(result.loseProbability)}%",
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun EquityBarSegments(win: Double, tie: Double, lose: Double) {
    androidx.compose.foundation.layout.Row(Modifier.fillMaxWidth().fillMaxSize()) {
        Box(Modifier.weight(win.toFloat().coerceAtLeast(0.001f)).fillMaxSize().background(PokerGreenLight))
        Box(Modifier.weight(tie.toFloat().coerceAtLeast(0.001f)).fillMaxSize().background(PokerGold))
        Box(Modifier.weight(lose.toFloat().coerceAtLeast(0.001f)).fillMaxSize().background(PokerRed))
    }
}

private fun pct(x: Double): String = String.format(Locale.getDefault(), "%.1f", x * 100)
