import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'vertix_token';
const REFRESH_KEY = 'vertix_refresh';

export async function saveTokens(accessToken: string, refreshToken?: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken, { keychainAccessible: SecureStore.WHEN_UNLOCKED });
  }
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
