import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import useProfileStore from '../stores/useProfileStore';

export default function Creator({ navigation }: any) {
  const coinBalance = useProfileStore((s) => s.coinBalance);
  const creatorMode = useProfileStore((s) => s.creatorMode);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Creator Dashboard</Text>
      <Text style={styles.sub}>Creator mode: {creatorMode ? 'Enabled' : 'Disabled'}</Text>
      <Text style={styles.sub}>Earnings balance: {coinBalance} coins</Text>
      <View style={{ height: 12 }} />
      <Button title="Upload a video" onPress={() => navigation.navigate('Upload' as any)} />
      <View style={{ height: 8 }} />
      <Button title="View Analytics" onPress={() => { /* placeholder */ }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  sub: { color: '#444', marginBottom: 8 }
});
