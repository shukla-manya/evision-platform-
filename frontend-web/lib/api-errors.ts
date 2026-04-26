import axios from 'axios';

function normalizeAxiosData(data: unknown): { message?: string | string[] } | undefined {
  if (data == null) return undefined;
  if (typeof data === 'object' && data !== null && !ArrayBuffer.isView(data) && !(data instanceof ArrayBuffer)) {
    return data as { message?: string | string[] };
  }
  if (data instanceof ArrayBuffer) {
    try {
      const txt = new TextDecoder().decode(new Uint8Array(data));
      const parsed = JSON.parse(txt) as { message?: string | string[] };
      return parsed;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = normalizeAxiosData(err.response?.data);
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join(', ');
  }
  return fallback;
}
