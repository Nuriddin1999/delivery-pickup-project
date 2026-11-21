import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface Courier {
  id: string;
  name: string;
}

const API_PORT = 8080;

/**
 * Where the Go server is. In order:
 * 1. EXPO_PUBLIC_API_URL, if set (for example http://192.168.1.10:8080).
 * 2. The computer that runs `expo start`, on port 8080. The phone or
 *    emulator already reaches that computer to load the app, so the same
 *    address works for the server.
 * 3. The emulator's alias for the computer (10.0.2.2) on Android, localhost elsewhere.
 */
function apiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = apiUrl();

/** The couriers, taken from the dispatch state. */
export async function fetchCouriers(signal?: AbortSignal): Promise<Courier[]> {
  const res = await fetch(`${API_URL}/api/state`, { signal });
  if (!res.ok) throw new Error(`Server answered ${res.status}`);
  const state: { couriers: Courier[] } = await res.json();
  return state.couriers.map(({ id, name }) => ({ id, name }));
}
