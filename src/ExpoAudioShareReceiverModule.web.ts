import type { AudioFile } from './ExpoAudioShareReceiver.types';
import { EventSubscription } from 'expo-modules-core';

export default {
  async setAppGroup(_groupId: string) {
    console.warn('ExpoAudioShareReceiver: setAppGroup() not supported on web.');
  },

  async getSharedAudioFiles(): Promise<AudioFile[]> {
    console.warn('ExpoAudioShareReceiver: getSharedAudioFiles() not supported on web.');
    return [];
  },

  async refreshFiles(): Promise<AudioFile[]> {
    console.warn('ExpoAudioShareReceiver: refreshFiles() not supported on web.');
    return [];
  },

  addListener(eventName: string, listener: (event: any) => void): EventSubscription {
    // Return a dummy subscription
    return { remove: () => {} };
  },

  removeAllListeners(eventName: string) {
    // No-op
  }
};
