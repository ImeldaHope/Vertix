import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Platform } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import * as AuthSession from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';
const GOOGLE_CLIENT_ID = process.env.EXPO_GOOGLE_CLIENT_ID || '';

export default function SignIn({ navigation }: any) {
  const { signIn, signInGuest, socialSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (e) {}
    setLoading(false);
  };

  const handleGuest = async () => {
    setLoading(true);
    await signInGuest();
    setLoading(false);
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      const redirectUri = AuthSession.makeRedirectUri({ useProxy: true });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
        GOOGLE_CLIENT_ID
      )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=openid%20profile%20email&nonce=nonce`;
      const result = await AuthSession.startAsync({ authUrl });
      if (result.type === 'success' && (result as any).params?.id_token) {
        const idToken = (result as any).params.id_token;
        if (socialSignIn) await socialSignIn('google', idToken);
      }
    } catch (e) {
      console.warn('Google sign-in error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME]
      });
      const token = (credential as any).identityToken;
      if (token) {
        if (socialSignIn) await socialSignIn('apple', token);
      }
    } catch (e) {
      console.warn('Apple sign-in error', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Vertix</Text>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
      <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={handleSignIn} />
      <View style={{ height: 12 }} />
      <Button title="Continue with Google" onPress={handleGoogle} />
      {Platform.OS === 'ios' && (
        <>
          <View style={{ height: 8 }} />
          <Button title="Continue with Apple" onPress={handleApple} />
        </>
      )}
      <Button title="Continue as Guest" onPress={handleGuest} />
      <View style={{ height: 12 }} />
      <Button title="Create account" onPress={() => navigation.navigate('SignUp')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 10, borderRadius: 6 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20, textAlign: 'center' }
});
