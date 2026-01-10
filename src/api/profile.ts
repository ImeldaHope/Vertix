import api from './apiClient';

export async function getProfile() {
  return api.get('/me/profile');
}

export async function patchProfile(data: any) {
  return api.patch('/me', data);
}

export async function reportWatched(videoId: string, seconds: number) {
  return api.post('/me/watched', { videoId, secondsWatched: seconds, clientTs: Date.now() });
}

export async function saveVideo(id: string) {
  return api.post('/me/saved', { videoId: id });
}

export async function getCoins() {
  return api.get('/me/coins');
}
