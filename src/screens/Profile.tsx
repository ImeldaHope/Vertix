import React from 'react';
import { View, Text, StyleSheet, Image, Button, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import useProfileStore from '../stores/useProfileStore';
import CoinBadge from '../components/CoinBadge';

export default function Profile() {
  const { user } = useAuth();
  const coinBalance = useProfileStore((s) => s.coinBalance);
  const watched = useProfileStore((s) => s.watched);
  const saved = useProfileStore((s) => s.saved);
  const toggleCreatorMode = useProfileStore((s) => s.toggleCreatorMode);
  const creatorMode = useProfileStore((s) => s.creatorMode);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: (user as any)?.avatar || 'https://placekitten.com/200/200' }} style={styles.avatar} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{(user as any)?.displayName || 'Guest'}</Text>
          <Text style={styles.handle}>{(user as any)?.email || ''}</Text>
        </View>
        <View style={{ marginLeft: 'auto' }}>
          <CoinBadge coins={coinBalance} />
        </View>
      </View>

      <View style={{ marginVertical: 12 }}>
        <Button title={creatorMode ? 'Disable Creator Mode' : 'Enable Creator Mode'} onPress={toggleCreatorMode} />
      </View>

      <Text style={styles.section}>Saved</Text>
      <FlatList data={saved} keyExtractor={(i) => i.id} renderItem={({ item }) => <Text style={styles.item}>{item.id}</Text>} />

      <Text style={styles.section}>Recently Watched</Text>
      <FlatList data={watched} keyExtractor={(i) => i.id + String(i.watchedAt)} renderItem={({ item }) => (
        <View style={styles.watchedItem}>
          <Text style={styles.item}>{item.id}</Text>
          <Text style={styles.sub}>{new Date(item.watchedAt).toLocaleString()} • {Math.round(item.seconds)}s</Text>
        </View>
      )} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ddd' },
  name: { fontSize: 18, fontWeight: '700' },
  handle: { color: '#666' },
  section: { marginTop: 16, fontWeight: '700' },
  item: { paddingVertical: 8 },
  watchedItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sub: { color: '#666', fontSize: 12 }
});
