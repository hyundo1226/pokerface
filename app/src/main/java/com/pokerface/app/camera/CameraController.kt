package com.pokerface.app.camera

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.graphics.RectF
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** CameraX 미리보기 + 정지 촬영을 감싸는 얇은 헬퍼. */
class CameraController(private val context: Context) {

    private var imageCapture: ImageCapture? = null

    suspend fun bind(previewView: PreviewView, lifecycleOwner: LifecycleOwner) {
        val cameraProvider = getCameraProvider()

        val preview = Preview.Builder().build().also {
            it.surfaceProvider = previewView.surfaceProvider
        }
        val capture = ImageCapture.Builder()
            .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
            .build()

        cameraProvider.unbindAll()
        cameraProvider.bindToLifecycle(
            lifecycleOwner,
            CameraSelector.DEFAULT_BACK_CAMERA,
            preview,
            capture,
        )
        imageCapture = capture
    }

    suspend fun takePicture(): Bitmap = suspendCancellableCoroutine { cont ->
        val capture = imageCapture
        if (capture == null) {
            cont.resumeWithException(IllegalStateException("카메라가 아직 준비되지 않았습니다"))
            return@suspendCancellableCoroutine
        }
        capture.takePicture(
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    val bitmap = runCatching { imageProxyToBitmap(image) }
                    image.close()
                    bitmap.fold(
                        onSuccess = { if (cont.isActive) cont.resume(it) },
                        onFailure = { if (cont.isActive) cont.resumeWithException(it) },
                    )
                }

                override fun onError(exception: ImageCaptureException) {
                    if (cont.isActive) cont.resumeWithException(exception)
                }
            },
        )
    }

    private suspend fun getCameraProvider(): ProcessCameraProvider = suspendCancellableCoroutine { cont ->
        val future = ProcessCameraProvider.getInstance(context)
        future.addListener(
            {
                runCatching { future.get() }
                    .onSuccess { if (cont.isActive) cont.resume(it) }
                    .onFailure { if (cont.isActive) cont.resumeWithException(it) }
            },
            ContextCompat.getMainExecutor(context),
        )
    }

    companion object {
        private fun imageProxyToBitmap(image: ImageProxy): Bitmap {
            val buffer = image.planes[0].buffer
            val bytes = ByteArray(buffer.remaining())
            buffer.get(bytes)
            val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                ?: throw IllegalStateException("이미지를 디코딩하지 못했습니다")
            val rotation = image.imageInfo.rotationDegrees
            if (rotation == 0) return decoded
            val matrix = Matrix().apply { postRotate(rotation.toFloat()) }
            return Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        }

        /** 0~1 비율 좌표([rectFraction])로 표현된 영역을 잘라낸다. */
        fun cropFraction(bitmap: Bitmap, rectFraction: RectF): Bitmap {
            val left = (rectFraction.left * bitmap.width).toInt().coerceIn(0, bitmap.width - 1)
            val top = (rectFraction.top * bitmap.height).toInt().coerceIn(0, bitmap.height - 1)
            val right = (rectFraction.right * bitmap.width).toInt().coerceIn(left + 1, bitmap.width)
            val bottom = (rectFraction.bottom * bitmap.height).toInt().coerceIn(top + 1, bitmap.height)
            return Bitmap.createBitmap(bitmap, left, top, right - left, bottom - top)
        }
    }
}
