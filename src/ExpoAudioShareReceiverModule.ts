import { NativeModulesProxy } from 'expo-modules-core';
const { ExpoAudioShareReceiver } = NativeModulesProxy;

import type { AudioFile } from './ExpoAudioShareReceiver.types';

export default {
  /** Sets App Group ID for file storage */
  async setAppGroup(groupId: string) {
    await ExpoAudioShareReceiver.setAppGroup(groupId);
  },

  /** Returns all shared audio file paths */
  async getSharedAudioFiles(): Promise<AudioFile[]> {
    const paths: string[] = await ExpoAudioShareReceiver.getSharedAudioFiles();
    return paths.map(p => ({ path: p }));
  },

  /** Optional: triggers a refresh and emits onNewFiles event */
  async refreshFiles(): Promise<AudioFile[]> {
    const paths: string[] = await ExpoAudioShareReceiver.refreshFiles();
    return paths.map(p => ({ path: p }));
  }
};
