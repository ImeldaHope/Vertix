import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Image } from 'react-native';
import api from '../api/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileEdit({ navigation }: any) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState((user as any)?.displayName || '');
  const [avatar, setAvatar] = useState((user as any)?.avatar || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      await api.patch('/me', { displayName, avatar });
      navigation.goBack();
    } catch (e) {
      console.warn('profile save failed', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit profile</Text>
      <Image source={{ uri: avatar || 'https://placekitten.com/200/200' }} style={styles.avatar} />
      <TextInput placeholder="Avatar URL" value={avatar} onChangeText={setAvatar} style={styles.input} />
      <TextInput placeholder="Display name" value={displayName} onChangeText={setDisplayName} style={styles.input} />
      <Button title={loading ? 'Saving...' : 'Save'} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 10, borderRadius: 6 },
  avatar: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 12 }
});
