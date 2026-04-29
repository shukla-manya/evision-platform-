import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ev_browse_product_ids';
const MAX = 40;

export async function recordProductBrowse(productId: string): Promise<void> {
  if (!productId) return;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const prev = raw ? (JSON.parse(raw) as unknown) : [];
    const list = Array.isArray(prev) ? (prev as string[]) : [];
    const next = [productId, ...list.filter((x) => x !== productId)].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function getBrowseProductIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as string[]).filter(Boolean) : [];
  } catch {
    return [];
  }
}
