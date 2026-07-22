package com.pokerface.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

@Composable
fun HomeScreen(
    onStart: () -> Unit,
    onLearn: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("♠ 포커페이스 ♥", style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center)
        Spacer(Modifier.height(12.dp))
        Text(
            "둘이서(헤즈업) 텍사스 홀덤 전용 도우미입니다.\n" +
                "내 카드와 보드 카드를 입력하면 승률과 팟 오즈를 계산해서\n" +
                "콜 / 다이 / 레이즈 / 올인 중 무엇이 유리한지, 그 이유까지 알려드려요.",
            style = MaterialTheme.typography.bodyLarge,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(40.dp))
        Button(onClick = onStart, modifier = Modifier.fillMaxWidth()) {
            Text("핸드 분석 시작하기")
        }
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onLearn, modifier = Modifier.fillMaxWidth()) {
            Text("포커 기초 배우기")
        }
    }
}
