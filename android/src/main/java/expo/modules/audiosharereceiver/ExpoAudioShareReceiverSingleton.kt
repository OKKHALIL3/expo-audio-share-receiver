package expo.modules.audiosharereceiver

import android.content.Intent
import expo.modules.core.interfaces.SingletonModule

/**
 * Singleton to store the share intent when app is cold-started.
 * This allows the intent to persist until JavaScript is ready to handle it.
 */
object ExpoAudioShareReceiverSingleton : SingletonModule {

    override fun getName(): String = "ExpoAudioShareReceiver"

    // Store the initial launch intent containing shared files
    var shareIntent: Intent? = null

    // Flag indicating there's an unprocessed share
    var isPending: Boolean = false

    fun clear() {
        shareIntent = null
        isPending = false
    }
}
