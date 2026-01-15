# 🎧 Expo Audio Share Receiver

A React Native / Expo module that makes your app appear in the iOS Share Sheet for audio files, saves shared audio to an App Group container, and surfaces the file paths to your JS/TS code so you can build your own UI.

**Now with automatic setup via Expo Config Plugin!**

---

## Features

- Shows in the iOS Share Sheet for audio attachments
- Handles single or multiple audio files
- Stores files in an App Group container for safe sharing with the host app
- Simple JS/TS API: `setAppGroup`, `getSharedAudioFiles`, `refreshFiles`
- Emits `onNewFiles` when fresh audio arrives
- **Automatic Share Extension setup via Config Plugin** - no manual Xcode configuration needed!
- Web/Android stubs included (iOS is the supported platform)

---

## Installation

```bash
npm install expo-audio-share-receiver
# or
yarn add expo-audio-share-receiver
```

---

## Setup (Recommended: Config Plugin)

Add the plugin to your `app.config.js` or `app.json`:

```js
// app.config.js
module.exports = {
  expo: {
    // ... other config
    scheme: 'myapp', // Your app's URL scheme
    ios: {
      bundleIdentifier: 'com.myapp.app',
      teamId: 'YOUR_TEAM_ID', // Your Apple Developer Team ID
    },
    plugins: [
      [
        'expo-audio-share-receiver',
        {
          appGroupId: 'group.com.myapp.audioShare', // Required
          urlSchemes: ['myapp', 'exp+myapp'],       // Optional, defaults to app scheme
          urlPath: 'audioShare',                    // Optional, defaults to 'audioShare'
          extensionName: 'MyApp',                   // Optional, defaults to app name
        },
      ],
    ],
  },
};
```

Then run prebuild:

```bash
npx expo prebuild --clean
```

The plugin will automatically:
- Create the Share Extension target in your Xcode project
- Add App Groups capability to both your main app and the extension
- Configure all necessary entitlements, Info.plist, and storyboard files
- Set up proper build settings and embed the extension in your app

### Plugin Options

| Option | Required | Description |
|--------|----------|-------------|
| `appGroupId` | Yes | App Group identifier (e.g., `group.com.yourapp.audioShare`) |
| `urlSchemes` | No | Array of URL schemes for deep linking (defaults to `[config.scheme]`) |
| `urlPath` | No | Path component for deep link URL (defaults to `audioShare`) |
| `extensionName` | No | Display name shown in share sheet (defaults to app name) |

---

## Manual Setup (Alternative)

If you prefer manual setup or need more control:

1. **Enable App Groups**
   - Xcode → App Target → Signing & Capabilities → `+ Capability` → App Groups
   - Add one (e.g., `group.com.yourapp.audioShare`) and note the exact ID.

2. **Create a Share Extension target** (once per app)
   - Add a new "Share Extension" target in Xcode.
   - Copy `ShareViewController.swift` and `AudioShareStore.swift` from this package's `ios/` folder.
   - Turn on the **same App Group** capability for the extension.

3. **Configure identifiers**
   - In `ShareViewController.swift`, override `appGroupName`, `hostAppURLSchemes`, and `hostAppURLPath`.
   - In JS, call `setAppGroup` with the exact same App Group ID before reading files.

4. **Build & run**
   - Build the extension target once so Xcode registers entitlements.
   - Share an audio file from another app to verify it appears and saves.

---

## Usage (JS/TS)

```ts
import AudioShare from 'expo-audio-share-receiver';
import * as Linking from 'expo-linking';

const APP_GROUP = 'group.com.yourapp.audioShare';
const SHARE_SCHEME = 'myapp';

// Handle deep links from the share extension
function useAudioShareHandler(onFilesReceived: (files: {path: string}[]) => void) {
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.scheme !== SHARE_SCHEME) return;

      await AudioShare.setAppGroup(APP_GROUP);
      const files = await AudioShare.getSharedAudioFiles();
      if (files.length > 0) {
        onFilesReceived(files);
      }
    };

    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then(handleUrl);

    // Handle subsequent URLs (app already running)
    const subscription = Linking.addEventListener('url', event => {
      handleUrl(event.url);
    });

    return () => subscription.remove();
  }, [onFilesReceived]);
}
```

**Type**
```ts
type AudioFile = { path: string }
```

`path` is the local file path inside your App Group container. Move or play the file as needed in your app.

---

## API

- `setAppGroup(groupId: string): Promise<void>`
  Sets the App Group container used by the native module.

- `getSharedAudioFiles(): Promise<AudioFile[]>`
  Returns the current audio files copied into the App Group.

- `refreshFiles(): Promise<AudioFile[]>`
  Reads files and emits `onNewFiles` with `{ files: string[] }`.

- **Event** `onNewFiles`
  Fired when `refreshFiles` runs. Subscribe with `EventEmitter` from `expo-modules-core`.

---

## Share Extension Flow

1. User shares audio file(s) from another app
2. User selects your app from the share sheet
3. Share Extension saves files to App Group container
4. Extension triggers deep link to open your app (e.g., `myapp://audioShare`)
5. Your app's Linking handler catches the URL
6. Call `getSharedAudioFiles()` to retrieve the file paths
7. Process files as needed in your app

---

## Example: Complete Integration

```tsx
// components/SharedAudioHandler.tsx
import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import AudioShare from 'expo-audio-share-receiver';

const APP_GROUP_ID = 'group.com.yourapp.audioShare';
const SHARE_SCHEME = 'yourapp';

export function SharedAudioHandler({
  onFilesReceived
}: {
  onFilesReceived: (files: {path: string}[]) => void
}) {
  const handlingRef = useRef(false);

  useEffect(() => {
    const handleShareLink = async (url?: string | null) => {
      if (!url || handlingRef.current) return;

      const parsed = Linking.parse(url);
      if (parsed.scheme !== SHARE_SCHEME) return;

      handlingRef.current = true;
      try {
        await AudioShare.setAppGroup(APP_GROUP_ID);
        const files = await AudioShare.getSharedAudioFiles();
        if (files.length > 0) {
          onFilesReceived(files);
        }
      } finally {
        handlingRef.current = false;
      }
    };

    Linking.getInitialURL().then(handleShareLink);
    const subscription = Linking.addEventListener('url', e => handleShareLink(e.url));
    return () => subscription.remove();
  }, [onFilesReceived]);

  return null;
}
```

---

## Notes

- **Currently iOS only** — Web and Android stubs are included but do not support file sharing
- **Supports multiple audio files** — Users can share multiple files at once
- **All file access is local** — No network connection required
- **Files persist in App Group** — Clean up old files manually if needed
