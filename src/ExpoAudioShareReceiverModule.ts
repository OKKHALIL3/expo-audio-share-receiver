import { requireNativeModule, Platform } from 'expo-modules-core';
import { NativeEventEmitter, NativeModules } from 'react-native';
import type { AudioFile } from './ExpoAudioShareReceiver.types';

export interface ShareReceivedEvent {
  files: AudioFile[];
}

export interface ShareErrorEvent {
  message: string;
}

const ExpoAudioShareReceiver = requireNativeModule<{
  setAppGroup(groupId: string): Promise<void>;
  hasShareIntent(): Promise<boolean>;
  getShareIntent(): Promise<any[]>;
  getSharedAudioFiles(): Promise<any[]>;
  clearSharedFiles(): Promise<void>;
}>('ExpoAudioShareReceiver');

// Use React Native's NativeEventEmitter for event handling
const nativeEmitter = new NativeEventEmitter(NativeModules.ExpoAudioShareReceiver);

export default {
  /**
   * Sets App Group ID for file storage (iOS only, no-op on Android)
   */
  async setAppGroup(groupId: string): Promise<void> {
    await ExpoAudioShareReceiver.setAppGroup(groupId);
  },

  /**
   * Check if there's a pending share intent from cold start (Android)
   * On iOS, returns false - use deep links instead
   */
  async hasShareIntent(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return await ExpoAudioShareReceiver.hasShareIntent();
  },

  /**
   * Process and get the pending share intent (Android)
   * Call this on app start to handle shares that launched the app
   * Returns the list of shared files
   */
  async getShareIntent(): Promise<AudioFile[]> {
    if (Platform.OS !== 'android') {
      return [];
    }
    const files = await ExpoAudioShareReceiver.getShareIntent();
    return (files || []).map((f: any) => ({
      path: f.path,
      fileName: f.fileName,
      mimeType: f.mimeType,
      size: f.size,
    }));
  },

  /**
   * Returns all shared audio file paths currently in storage
   */
  async getSharedAudioFiles(): Promise<AudioFile[]> {
    const files = await ExpoAudioShareReceiver.getSharedAudioFiles();
    return (files || []).map((f: any) => ({
      path: f.path || f,
      fileName: f.fileName,
      mimeType: f.mimeType,
      size: f.size,
    }));
  },

  /**
   * Clears all shared audio files from storage
   */
  async clearSharedFiles(): Promise<void> {
    await ExpoAudioShareReceiver.clearSharedFiles();
  },

  /**
   * Listen for share events (Android: when app is running and receives share)
   * @param listener Callback receiving the shared files
   */
  addShareReceivedListener(listener: (event: ShareReceivedEvent) => void): { remove: () => void } {
    const subscription = nativeEmitter.addListener('onShareReceived', listener);
    return { remove: () => subscription.remove() };
  },

  /**
   * Listen for share errors
   */
  addErrorListener(listener: (event: ShareErrorEvent) => void): { remove: () => void } {
    const subscription = nativeEmitter.addListener('onError', listener);
    return { remove: () => subscription.remove() };
  },

  /**
   * Generic event listener (for backwards compatibility)
   */
  addListener(eventName: string, listener: (event: any) => void): { remove: () => void } {
    const subscription = nativeEmitter.addListener(eventName, listener);
    return { remove: () => subscription.remove() };
  },

  removeAllListeners(eventName: string): void {
    nativeEmitter.removeAllListeners(eventName);
  }
};
