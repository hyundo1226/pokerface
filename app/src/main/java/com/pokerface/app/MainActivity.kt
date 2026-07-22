package com.pokerface.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.pokerface.app.camera.CardRecognizer
import com.pokerface.app.ui.screens.HomeScreen
import com.pokerface.app.ui.screens.InputScreen
import com.pokerface.app.ui.screens.LearnScreen
import com.pokerface.app.ui.screens.ResultScreen
import com.pokerface.app.ui.screens.ScanScreen
import com.pokerface.app.ui.screens.SetupScreen
import com.pokerface.app.ui.theme.PokerFaceTheme
import com.pokerface.core.Card
import com.pokerface.core.Suit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            PokerFaceTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    PokerFaceApp()
                }
            }
        }
    }
}

private object Routes {
    const val HOME = "home"
    const val SETUP = "setup"
    const val SCAN_HERO = "scan_hero"
    const val SCAN_BOARD = "scan_board"
    const val INPUT = "input"
    const val RESULT = "result"
    const val LEARN = "learn"
}

/** OCR로 읽은 랭크와 잉크 색상만으로는 무늬를 확정할 수 없으므로, 빨강→하트/검정→스페이드를 기본값으로 채우고
 *  실제 무늬는 [SetupScreen]에서 사용자가 직접 확인·수정하도록 안내한다. */
private fun CardRecognizer.Guess.toDefaultCard(): Card? {
    val rank = rank ?: return null
    val suit = if (isRed) Suit.HEARTS else Suit.SPADES
    return Card(rank, suit)
}

@Composable
private fun PokerFaceApp() {
    val navController: NavHostController = rememberNavController()
    val pokerViewModel: PokerViewModel = viewModel()

    NavHost(navController = navController, startDestination = Routes.HOME) {
        composable(Routes.HOME) {
            HomeScreen(
                onStart = { navController.navigate(Routes.SETUP) },
                onLearn = { navController.navigate(Routes.LEARN) },
            )
        }
        composable(Routes.SETUP) {
            SetupScreen(
                viewModel = pokerViewModel,
                onNext = { navController.navigate(Routes.INPUT) },
                onScanHero = { navController.navigate(Routes.SCAN_HERO) },
                onScanBoard = { navController.navigate(Routes.SCAN_BOARD) },
            )
        }
        composable(Routes.SCAN_HERO) {
            ScanScreen(
                title = "내 카드 2장을 촬영하세요",
                slotCount = 2,
                onCancel = { navController.popBackStack() },
                onCaptured = { guesses ->
                    pokerViewModel.setHeroCards(guesses.map { it.toDefaultCard() })
                    navController.popBackStack()
                },
            )
        }
        composable(Routes.SCAN_BOARD) {
            val boardCount = pokerViewModel.uiState.value.street.boardCount
            ScanScreen(
                title = "보드 카드 ${boardCount}장을 촬영하세요",
                slotCount = boardCount,
                onCancel = { navController.popBackStack() },
                onCaptured = { guesses ->
                    pokerViewModel.setBoardCards(guesses.map { it.toDefaultCard() })
                    navController.popBackStack()
                },
            )
        }
        composable(Routes.INPUT) {
            InputScreen(
                viewModel = pokerViewModel,
                onCalculate = { navController.navigate(Routes.RESULT) },
            )
        }
        composable(Routes.RESULT) {
            ResultScreen(
                viewModel = pokerViewModel,
                onBack = {
                    pokerViewModel.resetCards()
                    navController.popBackStack(Routes.SETUP, inclusive = false)
                },
                onLearn = { navController.navigate(Routes.LEARN) },
            )
        }
        composable(Routes.LEARN) {
            LearnScreen(onBack = { navController.popBackStack() })
        }
    }
}
