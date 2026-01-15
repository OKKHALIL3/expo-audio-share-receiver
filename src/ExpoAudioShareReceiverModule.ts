import { requireNativeModule, EventEmitter, EventSubscription } from 'expo-modules-core';
import type { AudioFile } from './ExpoAudioShareReceiver.types';

const ExpoAudioShareReceiver = requireNativeModule('ExpoAudioShareReceiver');
const emitter = new EventEmitter(ExpoAudioShareReceiver);

export default {
  /** Sets App Group ID for file storage */
  async setAppGroup(groupId: string): Promise<void> {
    await ExpoAudioShareReceiver.setAppGroup(groupId);
  },

  /** Returns all shared audio file paths */
  async getSharedAudioFiles(): Promise<AudioFile[]> {
    const paths: string[] = await ExpoAudioShareReceiver.getSharedAudioFiles();
    return paths.map((p: string) => ({ path: p }));
  },

  /** Optional: triggers a refresh and emits onNewFiles event */
  async refreshFiles(): Promise<AudioFile[]> {
    const paths: string[] = await ExpoAudioShareReceiver.refreshFiles();
    return paths.map((p: string) => ({ path: p }));
  },

  addListener(eventName: string, listener: (event: any) => void): EventSubscription {
    // @ts-ignore: Event types are not strictly typed in this wrapper yet
    return emitter.addListener(eventName, listener);
  },

  removeAllListeners(eventName: string) {
    // @ts-ignore: Event types are not strictly typed in this wrapper yet
    return emitter.removeAllListeners(eventName);
  }
};
