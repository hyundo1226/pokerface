package com.pokerface.app.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.RectF
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import com.pokerface.app.camera.CameraController
import com.pokerface.app.camera.CardRecognizer
import com.pokerface.app.ui.theme.PokerGold
import kotlinx.coroutines.launch

/**
 * 카메라로 카드를 촬영하는 화면. [slotCount]개의 안내 사각형을 보여주고,
 * 촬영 후 각 영역을 잘라 [CardRecognizer]로 랭크/색상을 추정한다.
 * 인식 결과는 추정값이므로 다음 화면에서 반드시 사용자가 확인/수정해야 한다.
 */
@Composable
fun ScanScreen(
    title: String,
    slotCount: Int,
    onCancel: () -> Unit,
    onCaptured: (List<CardRecognizer.Guess>) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED,
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted -> hasPermission = granted }

    LaunchedEffect(Unit) {
        if (!hasPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
    }

    if (!hasPermission) {
        PermissionRequiredContent(
            onRequest = { permissionLauncher.launch(Manifest.permission.CAMERA) },
            onCancel = onCancel,
        )
        return
    }

    val controller = remember { CameraController(context) }
    val previewView = remember { PreviewView(context) }
    var isProcessing by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val slots = remember(slotCount) { computeSlotRects(slotCount) }

    LaunchedEffect(Unit) {
        runCatching { controller.bind(previewView, lifecycleOwner) }
            .onFailure { errorMessage = "카메라를 여는 데 실패했습니다: ${it.message}" }
    }

    Box(Modifier.fillMaxSize()) {
        AndroidView(factory = { previewView }, modifier = Modifier.fillMaxSize())

        Canvas(Modifier.fillMaxSize()) {
            slots.forEachIndexed { index, rect ->
                val topLeft = Offset(rect.left * size.width, rect.top * size.height)
                val boxSize = Size((rect.right - rect.left) * size.width, (rect.bottom - rect.top) * size.height)
                drawRect(color = PokerGold, topLeft = topLeft, size = boxSize, style = Stroke(width = 5f))
                drawContext.canvas.nativeCanvas.drawText(
                    "${index + 1}",
                    topLeft.x + 8f,
                    topLeft.y + 36f,
                    android.graphics.Paint().apply {
                        color = android.graphics.Color.WHITE
                        textSize = 34f
                        isFakeBoldText = true
                    },
                )
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(top = 40.dp, start = 16.dp, end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(title, color = Color.White, style = MaterialTheme.typography.titleLarge)
            Text(
                "노란 사각형 안에 카드가 잘 보이도록 맞춘 뒤 촬영하세요",
                color = Color.White,
                style = MaterialTheme.typography.bodyMedium,
            )
            errorMessage?.let {
                Text(it, color = Color.Red, style = MaterialTheme.typography.bodyMedium)
            }
        }

        if (isProcessing) {
            CircularProgressIndicator(modifier = Modifier.align(Alignment.Center), color = PokerGold)
        }

        Row(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(bottom = 32.dp, start = 24.dp, end = 24.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            OutlinedButton(onClick = onCancel, enabled = !isProcessing) { Text("취소") }
            Button(
                enabled = !isProcessing,
                onClick = {
                    scope.launch {
                        isProcessing = true
                        errorMessage = null
                        try {
                            val bitmap = controller.takePicture()
                            val guesses = slots.map { rect ->
                                val crop = CameraController.cropFraction(bitmap, rect)
                                CardRecognizer.recognize(crop)
                            }
                            onCaptured(guesses)
                        } catch (e: Exception) {
                            errorMessage = "촬영/인식에 실패했습니다: ${e.message}"
                        } finally {
                            isProcessing = false
                        }
                    }
                },
            ) { Text(if (isProcessing) "인식 중..." else "촬영") }
        }
    }
}

@Composable
private fun PermissionRequiredContent(onRequest: () -> Unit, onCancel: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("카드를 인식하려면 카메라 권한이 필요합니다.", style = MaterialTheme.typography.bodyLarge)
        Spacer(Modifier.size(16.dp))
        Button(onClick = onRequest) { Text("권한 허용하기") }
        Spacer(Modifier.size(8.dp))
        OutlinedButton(onClick = onCancel) { Text("직접 입력으로 돌아가기") }
    }
}

private fun computeSlotRects(count: Int): List<RectF> {
    if (count <= 0) return emptyList()
    val margin = 0.06f
    val gap = 0.02f
    val yTop = 0.36f
    val yBottom = 0.66f
    val totalGap = gap * (count - 1)
    val boxWidth = (1f - 2 * margin - totalGap) / count
    return (0 until count).map { i ->
        val left = margin + i * (boxWidth + gap)
        RectF(left, yTop, left + boxWidth, yBottom)
    }
}
