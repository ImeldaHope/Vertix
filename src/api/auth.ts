import api from './apiClient';

export async function login(email: string, password: string) {
  return api.post('/auth/login', { email, password });
}

export async function signup(email: string, password: string, displayName?: string) {
  return api.post('/auth/signup', { email, password, displayName });
}

export async function refreshToken(refresh: string) {
  return api.post('/auth/refresh', { refreshToken: refresh });
}

export async function guestLogin() {
  return api.post('/auth/guest');
}

export async function socialLogin(provider: string, token: string) {
  return api.post('/auth/social', { provider, token });
}
