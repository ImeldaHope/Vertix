import api from './apiClient';

export async function verifyAd(provider: string, providerToken: string, adUnitId?: string) {
  return api.post('/ads/verify', { provider, providerToken, adUnitId });
}

export async function providerCallback(payload: any, signature: string) {
  return api.post('/ads/callback', payload, { headers: { 'x-ad-signature': signature } });
}
