import api from './apiClient';

export async function reportWatch(videoId: string, seconds: number) {
  return api.post('/rewards/watch', { videoId, secondsWatched: seconds, clientTs: Date.now() });
}
