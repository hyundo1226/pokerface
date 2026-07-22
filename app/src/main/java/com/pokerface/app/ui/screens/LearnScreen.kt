package com.pokerface.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pokerface.app.ui.theme.PokerGold
import com.pokerface.core.HandCategory

@Composable
fun LearnScreen(onBack: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
    ) {
        Text("포커 기초 배우기", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(16.dp))

        LearnCard(title = "족보 순위 (강한 순)") {
            HandCategory.entries.sortedByDescending { it.rank }.forEach { category ->
                Text("${category.rank + 1}. ${category.koreanLabel} — ${handCategoryDescription(category)}")
            }
        }

        LearnCard(title = "팟 오즈(Pot Odds)란?") {
            Text(
                "상대가 베팅했을 때, 내가 콜해서 얻을 수 있는 배당 대비 비용의 비율이에요.\n\n" +
                    "필요 승률 = 콜 금액 ÷ (팟 + 콜 금액)\n\n" +
                    "예: 팟이 100, 상대가 20을 베팅하면 콜 후 팟은 120+20=140... " +
                    "정확히는 콜 금액 20 ÷ (팟 100 + 콜 20) = 약 16.7%. " +
                    "즉 내 승률이 16.7%보다 높으면 콜은 수학적으로 이득이에요.",
            )
        }

        LearnCard(title = "승률(Equity)이란?") {
            Text(
                "지금 카드 상태에서 남은 카드가 모두 나왔을 때, 내가 이길 확률(무승부는 절반으로 계산)이에요.\n" +
                    "이 앱은 상대 카드를 알 수 없다고 가정하고, 수천~수만 번의 가상 게임을 " +
                    "돌려서(몬테카를로 시뮬레이션) 이 확률을 추정해요.",
            )
        }

        LearnCard(title = "아웃츠(Outs)란?") {
            Text(
                "내 핸드를 더 좋게 만들어줄 수 있는 '남은 카드의 장수'예요.\n" +
                    "예를 들어 플러시 드로우(같은 무늬 4장)라면 같은 무늬 카드가 9장 남아있으니 아웃츠는 9장.\n" +
                    "간단 계산법(rule of 4/2): 남은 카드가 2장일 때는 아웃츠×4%, 1장 남았을 때는 아웃츠×2%가 " +
                    "대략적인 승률이에요.",
            )
        }

        LearnCard(title = "헤즈업(둘이서) 기본 전략 팁") {
            Text(
                "• 상대가 한 명뿐이므로 핸드 범위가 넓어져요. 페어나 좋은 하이카드는 생각보다 자주 이깁니다.\n" +
                    "• 팟 오즈보다 승률이 낮으면 과감히 폴드하세요. '아깝다'는 감정은 손해로 이어집니다.\n" +
                    "• 승률이 매우 높을 땐 체크보다 베팅해서 상대의 돈을 더 가져오세요 (밸류 베팅).\n" +
                    "• 이 앱의 추천은 순수 수학(승률 vs 팟 오즈) 기준이며, 상대의 블러프 성향까지는 고려하지 않아요. " +
                    "참고용으로 활용하고, 실전 감각은 경험으로 함께 길러보세요.",
            )
        }

        Spacer(Modifier.height(24.dp))
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
            Text("돌아가기")
        }
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun LearnCard(title: String, content: @Composable Column.() -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 16.dp),
        colors = CardDefaults.cardColors(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(title, style = MaterialTheme.typography.titleLarge, color = PokerGold, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

private fun handCategoryDescription(category: HandCategory): String = when (category) {
    HandCategory.STRAIGHT_FLUSH -> "같은 무늬로 연속된 5장 (가장 강함)"
    HandCategory.FOUR_OF_A_KIND -> "같은 숫자 4장"
    HandCategory.FULL_HOUSE -> "트리플 + 원페어"
    HandCategory.FLUSH -> "같은 무늬 5장"
    HandCategory.STRAIGHT -> "숫자가 연속된 5장 (무늬 무관)"
    HandCategory.THREE_OF_A_KIND -> "같은 숫자 3장"
    HandCategory.TWO_PAIR -> "페어 2쌍"
    HandCategory.ONE_PAIR -> "같은 숫자 2장"
    HandCategory.HIGH_CARD -> "위 조합이 없을 때, 가장 높은 카드로 승부"
}
