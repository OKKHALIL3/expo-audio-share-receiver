package expo.modules.audiosharereceiver

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * Lifecycle listener that captures the share intent when the app is cold-started.
 * When a user shares audio to the app and the app isn't running, this captures
 * the intent in onCreate so it can be processed once React Native is ready.
 */
class ExpoAudioShareReceiverLifecycleListener(activityContext: Context) : ReactActivityLifecycleListener {

    companion object {
        private const val TAG = "AudioShareLifecycle"
    }

    override fun onCreate(activity: Activity?, savedInstanceState: Bundle?) {
        val intent = activity?.intent ?: return

        // Check if this is a share intent with audio
        if (isAudioShareIntent(intent)) {
            Log.d(TAG, "Captured share intent on cold start: ${intent.action}, type: ${intent.type}")
            ExpoAudioShareReceiverSingleton.shareIntent = intent
            ExpoAudioShareReceiverSingleton.isPending = true
        }
    }

    private fun isAudioShareIntent(intent: Intent): Boolean {
        val action = intent.action
        val type = intent.type ?: return false

        return (action == Intent.ACTION_SEND || action == Intent.ACTION_SEND_MULTIPLE) &&
               type.startsWith("audio/")
    }
}
