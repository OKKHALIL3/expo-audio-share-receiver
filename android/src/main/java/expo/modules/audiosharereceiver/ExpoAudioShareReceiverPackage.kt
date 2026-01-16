package expo.modules.audiosharereceiver

import android.content.Context
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/**
 * Package that registers the lifecycle listener with the Expo modules system.
 * This is automatically discovered by Expo's autolinking.
 */
class ExpoAudioShareReceiverPackage : Package {

    override fun createReactActivityLifecycleListeners(activityContext: Context): List<ReactActivityLifecycleListener> {
        return listOf(ExpoAudioShareReceiverLifecycleListener(activityContext))
    }
}
