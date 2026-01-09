import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoAudioShareReceiverViewProps } from './ExpoAudioShareReceiver.types';

const NativeView: React.ComponentType<ExpoAudioShareReceiverViewProps> =
  requireNativeView('ExpoAudioShareReceiver');

export default function ExpoAudioShareReceiverView(props: ExpoAudioShareReceiverViewProps) {
  return <NativeView {...props} />;
}
