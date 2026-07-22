package com.pokerface.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val PokerGreen = Color(0xFF0B6B3A)
val PokerGreenDark = Color(0xFF053D20)
val PokerGreenLight = Color(0xFF14895A)
val PokerGold = Color(0xFFD4AF37)
val PokerRed = Color(0xFFC0392B)
val PokerCream = Color(0xFFFAF6EC)
val PokerBlack = Color(0xFF1A1A1A)

private val PokerColorScheme = darkColorScheme(
    primary = PokerGold,
    onPrimary = PokerBlack,
    secondary = PokerGreenLight,
    onSecondary = PokerCream,
    background = PokerGreenDark,
    onBackground = PokerCream,
    surface = PokerGreen,
    onSurface = PokerCream,
    error = PokerRed,
)

private val PokerTypography = Typography(
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 26.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    bodyLarge = TextStyle(fontSize = 16.sp),
    bodyMedium = TextStyle(fontSize = 14.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Medium, fontSize = 14.sp),
)

@Composable
fun PokerFaceTheme(content: @Composable () -> Unit) {
    // 다크/라이트 시스템 설정과 무관하게 카지노 테이블 느낌의 고정 팔레트를 사용한다.
    MaterialTheme(
        colorScheme = PokerColorScheme,
        typography = PokerTypography,
        content = content,
    )
}
