import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import initAds from '../services/adInit';
import nativeAdAdapter from '../services/nativeAdAdapter';

export default function AdTest() {
  const [status, setStatus] = useState<string>('idle');
  const [adapterInfo, setAdapterInfo] = useState<string>('unknown');

  useEffect(() => {
    (async () => {
      setStatus('initializing');
      try {
        await initAds();
        setStatus('initialized');
      } catch (e) {
        setStatus('error');
      }
    })();
  }, []);

  async function probeAdapter() {
    setAdapterInfo('probing');
    try {
      const a = await nativeAdAdapter.probe();
      setAdapterInfo(JSON.stringify(a));
    } catch (e) {
      setAdapterInfo(String(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ad SDK Test</Text>
      <Text>Status: {status}</Text>
      <Text>Adapter: {adapterInfo}</Text>
      <View style={styles.row}>
        <Button title="Probe Adapter" onPress={probeAdapter} />
      </View>
      <View style={styles.row}>
        <Button title="Re-init SDKs" onPress={() => initAds().then(() => setStatus('initialized')).catch(() => setStatus('error'))} />
      </View>
      <View style={{height: 24}} />
      <Text style={styles.note}>Note: This screen only works on builds that include native modules (EAS custom dev client or production builds). In Expo Go the native modules won't be available.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  row: { marginTop: 12 },
  note: { marginTop: 16, color: '#666' }
});
