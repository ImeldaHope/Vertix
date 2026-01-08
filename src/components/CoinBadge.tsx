import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { coins: number };

export default function CoinBadge({ coins }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>💎 {coins}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  text: { color: '#fff', fontWeight: '600' }
});
