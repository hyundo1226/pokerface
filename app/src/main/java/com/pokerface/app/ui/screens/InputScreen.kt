package com.pokerface.app.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.pokerface.app.PokerViewModel
import com.pokerface.app.ui.components.SectionLabel

@Composable
fun InputScreen(
    viewModel: PokerViewModel,
    onCalculate: () -> Unit,
) {
    val state by viewModel.uiState.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
    ) {
        Text("베팅 정보를 입력하세요", style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(4.dp))
        Text(
            "정확한 금액이 아니어도 괜찮아요. 비율(예: 팟 100 / 콜 20)만 맞으면 됩니다.",
            style = MaterialTheme.typography.bodyMedium,
            fontStyle = FontStyle.Italic,
        )

        Spacer(Modifier.height(20.dp))
        SectionLabel("현재 팟 크기")
        OutlinedTextField(
            value = state.potText,
            onValueChange = viewModel::setPotText,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))
        SectionLabel("내가 콜해야 하는 금액 (베팅이 없으면 0)")
        OutlinedTextField(
            value = state.toCallText,
            onValueChange = viewModel::setToCallText,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(16.dp))
        SectionLabel("내 남은 스택")
        OutlinedTextField(
            value = state.heroStackText,
            onValueChange = viewModel::setHeroStackText,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
        )

        state.errorMessage?.let {
            Spacer(Modifier.height(12.dp))
            Text(it, color = MaterialTheme.colorScheme.error)
        }

        Spacer(Modifier.height(28.dp))
        Button(
            onClick = {
                viewModel.calculateAdvice()
                onCalculate()
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
        ) {
            Text("승률 계산하고 추천받기")
        }
    }
}
