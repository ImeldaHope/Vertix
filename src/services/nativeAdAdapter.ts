// Lightweight adapter: uses native SDKs if available, otherwise falls back to simulated flow.
import * as AdService from './adService';

export async function loadAndShowRewardedAd(options?: { adUnitId?: string }) {
  // Try Google Mobile Ads first
  try {
    // dynamic import so project can run without native modules during development
    // @ts-ignore
    const admob = await import('react-native-google-mobile-ads');
    const { RewardedAd, TestIds, AdEventType } = admob.default || admob;
    const adUnitId = options?.adUnitId || TestIds.REWARDED;
    const rewarded = RewardedAd.createForAdRequest(adUnitId, { requestNonPersonalizedAdsOnly: true });
    return new Promise(async (resolve, reject) => {
      const unsubscribe = rewarded.onAdEvent((type: any, error: any, reward: any) => {
        if (type === AdEventType.LOADED) {
          rewarded.show();
        }
        if (type === AdEventType.EARNED_REWARD) {
          // provider token not available here; in some SDKs you get server-side token
          resolve({ provider: 'admob', providerToken: 'native-earned-token', reward });
        }
        if (type === AdEventType.ERROR) {
          unsubscribe();
          reject(error);
        }
      });
      await rewarded.load();
    });
  } catch {
    // Try AppLovin MAX
    try {
      // @ts-ignore
      const applovin = await import('react-native-applovin-max');
      const MAX = applovin.default || applovin;
      const adUnitId = options?.adUnitId || 'YOUR_MAX_REWARDED_AD_UNIT_ID';
      return new Promise((resolve, reject) => {
        const listener = (event: any) => {
          if (event.event === 'REWARDED_AD_REVENUE_PAID' || event.event === 'REWARDED_AD_LOADED') {
            // show
            MAX.showRewardedAd(adUnitId);
          }
          if (event.event === 'REWARDED_AD_RECEIVED_REWARD') {
            resolve({ provider: 'applovin', providerToken: 'native-max-token', reward: event });
          }
          if (event.event === 'REWARDED_AD_FAILED_TO_LOAD') reject(event);
        };
        MAX.addEventListener('OnRewardedAd', listener);
        MAX.loadRewardedAd(adUnitId);
      });
    } catch {
      // Fallback to simulated flow
      const token = await AdService.simulateRewardedAdFlow('simulated');
      return { provider: 'simulated', providerToken: token };
    }
  }
}

export async function probe() {
  const result: any = { admob: false, applovin: false };
  try {
    // @ts-ignore
    const admob = await import('react-native-google-mobile-ads');
    if (admob) result.admob = true;
  } catch (e) {
    result.admob = false;
  }
  try {
    // @ts-ignore
    const applovin = await import('react-native-applovin-max');
    if (applovin) result.applovin = true;
  } catch (e) {
    result.applovin = false;
  }
  return result;
}

export default { loadAndShowRewardedAd, probe };
*** End Patch