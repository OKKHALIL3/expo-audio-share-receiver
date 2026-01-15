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
        // Optional: Clear files after processing to free up space
        // await AudioShare.clearSharedFiles();
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

- `clearSharedFiles(): Promise<void>`
  Clears all shared audio files from the App Group container. Useful for cleanup after processing files.

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
          // Optional: Clear shared files after successful processing
          // This frees up space in the App Group container
          // await AudioShare.clearSharedFiles();
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
- **Files persist in App Group** — Files remain in the App Group container until explicitly cleared. Use `clearSharedFiles()` to clean up after processing to free up space

---

## Contributing

Contributions are welcome! Whether it's bug fixes, new features, documentation improvements, or platform support, your help makes this package better for everyone.

### Getting Started

1. **Fork the repository**

   Create your own copy of the project under your GitHub account. This allows you to make changes freely.

2. **Clone your fork**

   ```bash
   git clone https://github.com/your-username/expo-audio-share-receiver.git
   cd expo-audio-share-receiver
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Create a feature branch**

   Always work on a new branch instead of `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

### Making Changes

- Follow the existing code style and conventions
- Test your changes thoroughly, especially if modifying native code
- Update documentation if you're adding new features or changing APIs
- For Swift/Kotlin changes, ensure code compiles on both debug and release builds

### Committing Your Work

1. **Stage your changes**

   ```bash
   git add .
   ```

2. **Write clear commit messages**

   ```bash
   git commit -m "Add support for audio metadata extraction"
   ```

   Good commit messages describe **what** changed and **why**.

3. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

### Opening a Pull Request

1. Navigate to the original repository on GitHub
2. Click "New Pull Request" and select your branch
3. Provide a clear description:
   - What does this change do?
   - Why is it useful?
   - How was it tested?
   - Any breaking changes or migration notes?

4. Wait for review and be ready to address feedback

### Keeping Your Fork Updated

To stay in sync with the main repository:

```bash
# Add the upstream remote (only needed once)
git remote add upstream https://github.com/original-owner/expo-audio-share-receiver.git

# Fetch and merge updates
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

### Development Tips

- **Testing native changes**: Use `npx expo prebuild` in a test Expo app with this module linked locally
- **Config plugin changes**: Test the plugin thoroughly with `npx expo prebuild --clean`
- **TypeScript types**: Update type definitions in `src/` when adding new methods
- **iOS-specific**: Test on real devices when possible, especially for share extension functionality

### Areas for Contribution

- **Android support**: Share extension equivalent for Android
- **Additional audio formats**: Extend supported file types
- **File metadata**: Extract and expose audio metadata (title, artist, duration, etc.)
- **Testing**: Add automated tests for the config plugin and native modules
- **Documentation**: Examples, troubleshooting guides, or video tutorials

---

## License

This project is open source. Check the `package.json` for license details.
