// ExpoAudioShareReceiver.types.ts

export interface AudioFile {
  /** Full path to the audio file in app storage */
  path: string;
  /** Original filename */
  fileName?: string;
  /** MIME type (e.g., "audio/mpeg") */
  mimeType?: string;
  /** File size in bytes */
  size?: number;
}
