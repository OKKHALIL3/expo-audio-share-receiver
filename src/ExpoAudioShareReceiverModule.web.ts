import { registerWebModule, NativeModule } from 'expo';

import { ExpoAudioShareReceiverModuleEvents } from './ExpoAudioShareReceiver.types';

class ExpoAudioShareReceiverModule extends NativeModule<ExpoAudioShareReceiverModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoAudioShareReceiverModule, 'ExpoAudioShareReceiverModule');
