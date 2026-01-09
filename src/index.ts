// Reexport the native module. On web, it will be resolved to ExpoAudioShareReceiverModule.web.ts
// and on native platforms to ExpoAudioShareReceiverModule.ts
export { default } from './ExpoAudioShareReceiverModule';
export { default as ExpoAudioShareReceiverView } from './ExpoAudioShareReceiverView';
export * from  './ExpoAudioShareReceiver.types';
