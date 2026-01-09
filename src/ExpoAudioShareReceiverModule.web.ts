import type { AudioFile } from './ExpoAudioShareReceiver.types';

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
  }
};

