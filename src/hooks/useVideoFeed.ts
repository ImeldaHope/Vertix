import { useState, useCallback } from 'react';
import { Image } from 'react-native';

const initial = Array.from({ length: 6 }).map((_, i) => ({
  id: `mock-${i}`,
  uri: 'https://d1f0dff3ff2b3f.cloudfront.net/sample/hls/playlist.m3u8',
  thumb: 'https://d1f0dff3ff2b3f.cloudfront.net/sample/thumb.jpg'
}));

async function prefetchVideo(uri: string) {
  try {
    // head request to warm CDN/edge cache
    await fetch(uri, { method: 'HEAD' });
  } catch {
    // ignore
  }
}

export default function useVideoFeed() {
  const [items, setItems] = useState(initial);

  const loadMore = useCallback(() => {
    const next = Array.from({ length: 5 }).map((_, i) => ({
      id: `mock-more-${Date.now()}-${i}`,
      uri: 'https://d1f0dff3ff2b3f.cloudfront.net/sample/hls/playlist.m3u8',
      thumb: 'https://d1f0dff3ff2b3f.cloudfront.net/sample/thumb.jpg'
    }));
    // prefetch thumbnails and video heads for smoother UX
    next.forEach((it) => {
      if (it.thumb) Image.prefetch(it.thumb).catch(() => null);
      prefetchVideo(it.uri);
    });
    setItems((s) => [...s, ...next]);
  }, []);

  const preloadAround = useCallback((index: number) => {
    const next = items[index + 1];
    if (next) {
      if (next.thumb) Image.prefetch(next.thumb).catch(() => null);
      prefetchVideo(next.uri);
    }
  }, [items]);

  return {
    items,
    loadMore,
    preloadAround
  };
}
