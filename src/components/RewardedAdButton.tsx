import React, { useState } from 'react';
import { Button, View, ActivityIndicator, Text } from 'react-native';
import * as AdService from '../services/adService';
import * as NativeAdAdapter from '../services/nativeAdAdapter';
import useProfileStore from '../stores/useProfileStore';

export default function RewardedAdButton() {
  const [loading, setLoading] = useState(false);
  const addCoins = useProfileStore((s) => s.addCoins);
  const addReceipt = useProfileStore((s) => s.addReceipt);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cfg = await (await fetch((global as any).API_BASE_URL ? `${(global as any).API_BASE_URL}/ads/config` : '/ads/config')).json();
        if (!mounted) return;
        const cd = cfg?.rewarded?.cooldownSeconds || 60;
        const key = 'ad_last_ts';
        const raw = await (global as any).AsyncStorage?.getItem?.(key) || null;
        if (raw) {
          const last = Number(raw);
          const until = last + cd * 1000;
          setCooldownUntil(until > Date.now() ? until : null);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const handle = async () => {
    setLoading(true);
    try {
      // Try native SDK first, then server-verified flow
      const native = await NativeAdAdapter.loadAndShowRewardedAd();
      const provider = native?.provider || 'simulated';
      const providerToken = native?.providerToken || native;
      const res = await AdService.claimReward(provider, providerToken);
      if (res.data?.credited) {
        addCoins(res.data.credited);
        if (res.data.receipt) addReceipt(res.data.receipt);
        // store last ad timestamp for local cooldown
        try { (global as any).AsyncStorage?.setItem?.('ad_last_ts', String(Date.now())); } catch {}
        const cfg = res.data?.cfg || null;
        const cd = cfg?.rewarded?.cooldownSeconds || 60;
        setCooldownUntil(Date.now() + cd * 1000);
      }
    } catch (e) {
      console.warn('ad claim failed', e);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || (cooldownUntil != null && cooldownUntil > Date.now());
  return (
    <View>
      <Button title={disabled ? 'Try later' : (loading ? 'Loading ad...' : 'Watch ad to earn coins')} onPress={handle} disabled={disabled} />
      {loading && <ActivityIndicator />}
      {cooldownUntil && cooldownUntil > Date.now() && (
        <Text>Available in {Math.ceil((cooldownUntil - Date.now()) / 1000)}s</Text>
      )}
    </View>
  );
}
