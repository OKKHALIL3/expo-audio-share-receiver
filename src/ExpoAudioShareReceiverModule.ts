import { NativeModule, requireNativeModule } from 'expo';

import { ExpoAudioShareReceiverModuleEvents } from './ExpoAudioShareReceiver.types';

declare class ExpoAudioShareReceiverModule extends NativeModule<ExpoAudioShareReceiverModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoAudioShareReceiverModule>('ExpoAudioShareReceiver');
