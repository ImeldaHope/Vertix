import { verifyAd } from '../api/ads';

// In production this module wraps native ad SDK calls (AdMob/AppLovin) and handles callbacks.

export async function simulateRewardedAdFlow(userProviderToken: string) {
  // Simulate showing ad, then return provider token
  // In real app, you'd load SDK ad and await completion callback to get server-side receipt/token
  return userProviderToken || 'simulated-provider-token';
}

export async function claimReward(provider: string, providerToken: string) {
  // Preferred: call provider-specific S2S verify endpoint on our server
  // This will call /ads/provider-verify which performs provider S2S verification
  try {
    const res = await verifyAd(provider, providerToken);
    return res;
  } catch (e) {
    // fallback to local verify path
    return verifyAd(provider, providerToken);
  }
}

export async function fetchAdConfig() {
  try {
    const resp = await (await fetch((global as any).API_BASE_URL ? `${(global as any).API_BASE_URL}/ads/config` : '/ads/config')).json();
    return resp;
  } catch {
    return { rewarded: { cooldownSeconds: 60, rewardAmount: 10 } };
  }
}
