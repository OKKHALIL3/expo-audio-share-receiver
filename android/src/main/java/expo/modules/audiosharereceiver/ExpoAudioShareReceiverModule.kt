package expo.modules.audiosharereceiver

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Parcelable
import android.provider.OpenableColumns
import android.util.Log
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID

class ExpoAudioShareReceiverModule : Module() {

    companion object {
        private const val TAG = "AudioShareModule"
        const val SHARED_AUDIO_DIR = "shared_audio"
        val SUPPORTED_EXTENSIONS = listOf("mp3", "m4a", "wav", "aac", "aiff", "flac", "ogg", "wma", "caf")

        private var instance: ExpoAudioShareReceiverModule? = null

        /**
         * Called by OnNewIntent when app receives a share while running
         */
        fun handleShareIntent(intent: Intent) {
            if (instance == null) {
                Log.w(TAG, "Module instance not ready, storing intent")
                ExpoAudioShareReceiverSingleton.shareIntent = intent
                ExpoAudioShareReceiverSingleton.isPending = true
                return
            }
            instance?.processShareIntent(intent)
        }
    }

    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    private val storageDir: File
        get() = File(context.filesDir, SHARED_AUDIO_DIR).apply {
            if (!exists()) mkdirs()
        }

    override fun definition() = ModuleDefinition {
        Name("ExpoAudioShareReceiver")

        // Events sent to JavaScript
        Events("onShareReceived", "onError")

        OnCreate {
            instance = this@ExpoAudioShareReceiverModule
            Log.d(TAG, "Module created")
        }

        OnDestroy {
            instance = null
        }

        // Called when app receives a new intent while running
        OnNewIntent { intent ->
            Log.d(TAG, "OnNewIntent: ${intent.action}, type: ${intent.type}")
            if (isAudioShareIntent(intent)) {
                processShareIntent(intent)
            }
        }

        // Check if there's a pending share from cold start
        AsyncFunction("hasShareIntent") {
            ExpoAudioShareReceiverSingleton.isPending
        }

        // Get and process the pending share intent (call this on app start)
        AsyncFunction("getShareIntent") {
            val intent = ExpoAudioShareReceiverSingleton.shareIntent
            if (intent != null && isAudioShareIntent(intent)) {
                ExpoAudioShareReceiverSingleton.clear()
                processShareIntent(intent)
            }
            // Return current files
            getStoredFilesAsMap()
        }

        // Get list of shared audio files
        AsyncFunction("getSharedAudioFiles") {
            getStoredFilesAsMap()
        }

        // Clear all shared audio files
        AsyncFunction("clearSharedFiles") {
            clearStoredFiles()
        }

        // For iOS API compatibility (no-op on Android)
        AsyncFunction("setAppGroup") { _: String ->
            // No-op on Android, App Groups are iOS-only
        }
    }

    private fun isAudioShareIntent(intent: Intent): Boolean {
        val action = intent.action
        val type = intent.type ?: return false
        return (action == Intent.ACTION_SEND || action == Intent.ACTION_SEND_MULTIPLE) &&
               type.startsWith("audio/")
    }

    private fun processShareIntent(intent: Intent) {
        try {
            Log.d(TAG, "Processing share intent: ${intent.action}")

            val files = mutableListOf<Map<String, Any?>>()

            when (intent.action) {
                Intent.ACTION_SEND -> {
                    val uri = intent.parcelable<Uri>(Intent.EXTRA_STREAM)
                    if (uri != null) {
                        copyFileToStorage(uri)?.let { files.add(it) }
                    }
                }
                Intent.ACTION_SEND_MULTIPLE -> {
                    val uris = intent.parcelableArrayList<Uri>(Intent.EXTRA_STREAM)
                    uris?.forEach { uri ->
                        copyFileToStorage(uri)?.let { files.add(it) }
                    }
                }
            }

            if (files.isNotEmpty()) {
                Log.d(TAG, "Processed ${files.size} files, sending event")
                sendEvent("onShareReceived", mapOf("files" to files))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error processing share intent", e)
            sendEvent("onError", mapOf("message" to (e.message ?: "Unknown error")))
        }
    }

    private fun copyFileToStorage(uri: Uri): Map<String, Any?>? {
        try {
            val resolver = context.contentResolver

            // Get file info
            val fileName = getFileName(resolver, uri) ?: "audio_${System.currentTimeMillis()}"
            val mimeType = resolver.getType(uri) ?: "audio/*"

            // Ensure unique filename
            val destFile = getUniqueFile(storageDir, fileName)

            // Copy file
            resolver.openInputStream(uri)?.use { input ->
                destFile.outputStream().use { output ->
                    input.copyTo(output)
                }
            }

            if (destFile.exists() && destFile.length() > 0) {
                Log.d(TAG, "Copied file: ${destFile.absolutePath} (${destFile.length()} bytes)")
                return mapOf(
                    "path" to destFile.absolutePath,
                    "fileName" to destFile.name,
                    "mimeType" to mimeType,
                    "size" to destFile.length()
                )
            } else {
                Log.e(TAG, "Failed to copy file or file is empty")
                destFile.delete()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error copying file: ${e.message}", e)
        }
        return null
    }

    private fun getFileName(resolver: ContentResolver, uri: Uri): String? {
        var name: String? = null
        if (uri.scheme == "content") {
            resolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex >= 0) {
                        name = cursor.getString(nameIndex)
                    }
                }
            }
        }
        return name ?: uri.lastPathSegment
    }

    private fun getUniqueFile(directory: File, fileName: String): File {
        var file = File(directory, fileName)
        if (!file.exists()) return file

        val nameWithoutExt = fileName.substringBeforeLast(".")
        val ext = fileName.substringAfterLast(".", "")
        val suffix = UUID.randomUUID().toString().take(8)

        val newName = if (ext.isNotEmpty()) "${nameWithoutExt}_$suffix.$ext" else "${fileName}_$suffix"
        return File(directory, newName)
    }

    private fun getStoredFilesAsMap(): List<Map<String, Any>> {
        return storageDir.listFiles()
            ?.filter { it.isFile && it.length() > 0 && isAudioFile(it) }
            ?.sortedByDescending { it.lastModified() }
            ?.map { file ->
                mapOf(
                    "path" to file.absolutePath,
                    "fileName" to file.name,
                    "size" to file.length()
                )
            }
            ?: emptyList()
    }

    private fun clearStoredFiles() {
        storageDir.listFiles()?.forEach { file ->
            if (file.isFile && isAudioFile(file)) {
                file.delete()
            }
        }
        ExpoAudioShareReceiverSingleton.clear()
    }

    private fun isAudioFile(file: File): Boolean {
        return file.extension.lowercase() in SUPPORTED_EXTENSIONS
    }

    // Parcelable helpers for API compatibility
    private inline fun <reified T : Parcelable> Intent.parcelable(key: String): T? = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
            getParcelableExtra(key, T::class.java)
        else -> @Suppress("DEPRECATION") getParcelableExtra(key) as? T
    }

    private inline fun <reified T : Parcelable> Intent.parcelableArrayList(key: String): ArrayList<T>? = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ->
            getParcelableArrayListExtra(key, T::class.java)
        else -> @Suppress("DEPRECATION") getParcelableArrayListExtra(key)
    }
}
