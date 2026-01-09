import * as React from 'react';

import { ExpoAudioShareReceiverViewProps } from './ExpoAudioShareReceiver.types';

export default function ExpoAudioShareReceiverView(props: ExpoAudioShareReceiverViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
