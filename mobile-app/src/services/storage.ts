import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'ev_mobile_token';
const ELECTRICIAN_PROFILE_KEY = 'ev_electrician_profile';

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function setElectricianProfile(profile: Record<string, unknown>) {
  await AsyncStorage.setItem(ELECTRICIAN_PROFILE_KEY, JSON.stringify(profile || {}));
}

export async function getElectricianProfile<T = Record<string, unknown>>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(ELECTRICIAN_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await Promise.all([clearToken(), AsyncStorage.removeItem(ELECTRICIAN_PROFILE_KEY)]);
}
