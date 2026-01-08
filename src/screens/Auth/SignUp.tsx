import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function SignUp({ navigation }: any) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      await signUp(email, password, displayName);
    } catch (e) {}
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create an account</Text>
      <TextInput placeholder="Display name" value={displayName} onChangeText={setDisplayName} style={styles.input} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      <Button title={loading ? 'Creating...' : 'Sign Up'} onPress={handleSignUp} />
      <View style={{ height: 12 }} />
      <Button title="Already have an account? Sign in" onPress={() => navigation.navigate('SignIn')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 10, borderRadius: 6 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' }
});
