# Expo Audio Share Receiver

A React Native / Expo module that makes your app appear in the iOS Share Sheet for audio files, saves shared audio to an App Group container, and surfaces the file paths to your JS/TS code so you can build your own UI. The package ships with a ready-to-wire Share Extension; host apps only configure capabilities and identifiers—no Swift changes required.

---

## Features

- Shows in the iOS Share Sheet for audio attachments
- Handles single or multiple audio files
- Stores files in an App Group container for safe sharing with the host app
- Simple JS/TS API: `setAppGroup`, `getSharedAudioFiles`, `refreshFiles`
- Emits `onNewFiles` when fresh audio arrives
- Web/Android stubs included (iOS is the supported platform)

---

## Installation

```bash
# From npm
npm install expo-audio-share-receiver
# or
yarn add expo-audio-share-receiver

# If testing locally from a checked-out copy
yarn add ../path-to/expo-audio-share-receiver
```

Run `npx pod-install` (or open the iOS workspace and let Xcode resolve pods).

---

## iOS Setup (host app)

1) **Enable App Groups**  
   - Xcode → App Target → Signing & Capabilities → `+ Capability` → App Groups  
   - Add one (e.g., `group.com.yourapp.audioShare`) and note the exact ID.

2) **Create a Share Extension target** (once per app)  
   - Add a new “Share Extension” target in Xcode.  
   - Include `ShareViewController.swift` and `AudioShareStore.swift` from this package in the extension target.  
   - Turn on the **same App Group** capability for the extension.

3) **Configure identifiers**  
   - In `ShareViewController.swift`, set your App Group ID and optional deep-link URL the extension uses to reopen the host app (defaults: `group.com.theirapp.audioShare` and `theirapp://audioShare`).  
   - In JS, call `setAppGroup` with the exact same App Group ID before reading files. The native module falls back to `group.com.default.audioShare` if you skip configuration.

4) **Build & run**  
   - Build the extension target once so Xcode registers entitlements.  
   - Share an audio file from another app to verify it appears and saves.

> Only iOS is supported today. Android is a placeholder; the web module only logs warnings.

---

## Usage (JS/TS)

```ts
import AudioShare from 'expo-audio-share-receiver';
import { EventEmitter } from 'expo-modules-core';

const emitter = new EventEmitter(AudioShare as any);
const APP_GROUP = 'group.com.yourapp.audioShare';

async function initAudioShare() {
  await AudioShare.setAppGroup(APP_GROUP);

  // Read any files already shared
  const files = await AudioShare.getSharedAudioFiles();
  console.log('Shared files:', files);

  // Optional: trigger a refresh and handle new arrivals
  emitter.addListener('onNewFiles', ({ files }) => {
    console.log('New audio files added:', files);
  });
  const refreshed = await AudioShare.refreshFiles();
  console.log('Refreshed files:', refreshed);
}

initAudioShare();
```

**Type**  
`type AudioFile = { path: string }`

`path` is the local file path inside your App Group container. Move or play the file as needed in your app.

---

## API

- `setAppGroup(groupId: string): Promise<void>`  
  Sets the App Group container used by the native module. Defaults to `group.com.default.audioShare` if not set.

- `getSharedAudioFiles(): Promise<AudioFile[]>`  
  Returns the current audio files copied into the App Group.

- `refreshFiles(): Promise<AudioFile[]>`  
  Reads files and emits `onNewFiles` with `{ files: string[] }`. Use this to poll for new arrivals.

- **Event** `onNewFiles`  
  Fired when `refreshFiles` runs. Subscribe with `EventEmitter` from `expo-modules-core`.

---

## Share Extension Behavior

- Accepts audio attachments from the Share Sheet.  
- Copies each file into the configured App Group (overwrites if the name matches).  
- Triggers a deep link (`theirapp://audioShare` by default) so the host app can wake up.  
- The extension does not require host-app Swift changes beyond configuring identifiers.

Align the App Group ID and deep link between the extension (`ShareViewController.swift`) and your JS code.

---

## Development & Scripts

- `yarn build` — build the module
- `yarn lint` — lint
- `yarn test` — tests (via expo-module-scripts)
- `yarn clean` — clean build artifacts

---

## Notes

- **Currently iOS only** — Web and Android stubs are included but do not support file sharing
- **Supports multiple audio files** — Users can share multiple files at once
- **All file access is local** — No network connection required
