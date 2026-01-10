export async function initAds() {
  // Try Google Mobile Ads
  try {
    // dynamic import so the app can run without native modules in dev
    // @ts-ignore
    const admob = await import('react-native-google-mobile-ads');
    const mobileAds = admob?.default?.mobileAds || admob?.mobileAds || admob?.default;
    if (mobileAds && typeof mobileAds().initialize === 'function') {
      await mobileAds().initialize();
      console.log('Google Mobile Ads initialized');
    }
  } catch (e) {
    console.log('Google Mobile Ads not initialized (native module missing)', e?.message || e);
  }

  // Try AppLovin MAX
  try {
    // @ts-ignore
    const applovin = await import('react-native-applovin-max');
    const MAX = applovin?.default || applovin;
    if (MAX && typeof MAX.initialize === 'function') {
      // initialize with test dev key (replace in prod)
      const key = process.env.EXPO_MAX_SDK_KEY || 'YOUR_MAX_SDK_KEY';
      MAX.initialize(key, (success: any) => {
        console.log('AppLovin MAX initialized', success);
      });
    }
  } catch (e) {
    console.log('AppLovin MAX not initialized (native module missing)', e?.message || e);
  }
}

export default initAds;
