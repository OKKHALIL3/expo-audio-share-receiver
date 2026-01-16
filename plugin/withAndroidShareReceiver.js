const {
  withAndroidManifest,
} = require("@expo/config-plugins");

/**
 * Config plugin for Android share receiver
 * Adds intent-filter to MainActivity to receive audio/* share intents
 *
 * This approach allows the share intent to go directly to MainActivity,
 * where the native module can process it via OnNewIntent or the lifecycle listener.
 */
const withAndroidShareReceiver = (config, options = {}) => {
  config = withAudioShareIntentFilter(config);
  return config;
};

/**
 * Add audio share intent-filter to MainActivity
 */
const withAudioShareIntentFilter = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }

    // Find MainActivity
    const mainActivity = mainApplication.activity.find(
      (activity) => activity.$?.["android:name"] === ".MainActivity"
    );

    if (!mainActivity) {
      console.warn(
        `[expo-audio-share-receiver] MainActivity not found in AndroidManifest`
      );
      return config;
    }

    // Initialize intent-filter array if it doesn't exist
    if (!mainActivity["intent-filter"]) {
      mainActivity["intent-filter"] = [];
    }

    // Check if audio share intent-filter already exists
    const hasAudioShareFilter = mainActivity["intent-filter"].some(
      (filter) => {
        const hasAction = filter.action?.some(
          (a) => a.$?.["android:name"] === "android.intent.action.SEND"
        );
        const hasAudioData = filter.data?.some(
          (d) => d.$?.["android:mimeType"] === "audio/*"
        );
        return hasAction && hasAudioData;
      }
    );

    if (hasAudioShareFilter) {
      console.log(
        `[expo-audio-share-receiver] Audio share intent-filter already exists, skipping...`
      );
      return config;
    }

    // Add intent-filter for single audio file share
    mainActivity["intent-filter"].push({
      action: [{ $: { "android:name": "android.intent.action.SEND" } }],
      category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
      data: [{ $: { "android:mimeType": "audio/*" } }],
    });

    // Add intent-filter for multiple audio files share
    mainActivity["intent-filter"].push({
      action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
      category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
      data: [{ $: { "android:mimeType": "audio/*" } }],
    });

    console.log(
      `[expo-audio-share-receiver] Added audio share intent-filter to MainActivity`
    );

    return config;
  });
};

module.exports = withAndroidShareReceiver;
