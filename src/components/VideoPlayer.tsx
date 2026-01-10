import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Video, AVPlaybackStatus } from 'expo-av';
import api from '../api/apiClient';
import { reportWatch } from '../api/rewards';
import useProfileStore from '../stores/useProfileStore';

type Props = {
  id: string;
  uri: string;
  isActive: boolean;
};

const HEARTBEAT_MS = 10000;

export default function VideoPlayer({ id, uri, isActive }: Props) {
  const ref = useRef<Video | null>(null);
  const lastPosition = useRef<number>(0);
  const bufferedMillis = useRef<number>(0);
  const heartbeatTimer = useRef<number | null>(null);
  const addWatched = useProfileStore((s) => s.addWatched);
  const addCoins = useProfileStore((s) => s.addCoins);

  const sendHeartbeat = async (seconds: number) => {
    if (seconds <= 0) return;
    try {
      const r = await reportWatch(id, seconds);
      const credited = r.data?.credited || 0;
      if (credited > 0) addCoins(credited);
      const receipt = r.data?.receipt;
      if (receipt) {
        // store receipt for audit
        try { (useProfileStore as any) && null; } catch {}
        // safe way: call addReceipt through hook getter
        const addReceipt = require('../stores/useProfileStore').default.getState().addReceipt;
        if (addReceipt) addReceipt(receipt);
      }
    } catch (e) {
      console.warn('heartbeat failed', e);
    }
  };

  const onPlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const pos = status.positionMillis ?? 0;
    const delta = Math.max(0, pos - lastPosition.current);
    lastPosition.current = pos;
    if (status.isPlaying && isActive) {
      bufferedMillis.current += delta;
    }
    if ((status as any).didJustFinish) {
      const seconds = Math.floor(lastPosition.current / 1000);
      try {
        addWatched({ id, uri, watchedAt: Date.now(), seconds });
      } catch (e) {
        // ignore
      }
    }
  };

  useEffect(() => {
    // warm CDN/cache slightly
    fetch(uri, { method: 'HEAD' }).catch(() => null);
  }, [uri]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!ref.current) return;
      try {
        if (isActive) {
          await ref.current.playAsync();
          if (heartbeatTimer.current == null) {
            heartbeatTimer.current = global.setInterval(() => {
              const seconds = Math.floor(bufferedMillis.current / 1000);
              if (seconds > 0) {
                bufferedMillis.current = 0;
                sendHeartbeat(seconds);
              }
            }, HEARTBEAT_MS) as unknown as number;
          }
        } else {
          await ref.current.pauseAsync();
          const seconds = Math.floor(bufferedMillis.current / 1000);
          if (seconds > 0) {
            bufferedMillis.current = 0;
            await sendHeartbeat(seconds);
          }
          if (heartbeatTimer.current != null) {
            clearInterval(heartbeatTimer.current);
            heartbeatTimer.current = null;
          }
          try {
            await ref.current.unloadAsync();
          } catch {
          }
        }
      } catch (e) {
        if (!mounted) return;
        console.warn('Video control error', e);
      }
    })();
    return () => { mounted = false; };
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (heartbeatTimer.current != null) {
        clearInterval(heartbeatTimer.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Video
        ref={ref}
        style={styles.video}
        source={{ uri }}
        resizeMode="cover"
        shouldPlay={false}
        isLooping
        onPlaybackStatusUpdate={onPlaybackStatus}
        useNativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  video: {
    ...StyleSheet.absoluteFillObject
  }
});
