import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface Courier {
  id: string;
  name: string;
  /** Today's route after the start point: pickups, the hub, deliveries. Empty when nothing is held. */
  stops: RouteStop[];
}

export type RouteStop = { kind: 'hub' } | { kind: 'pickup' | 'delivery'; orderId: string };

export interface Order {
  id: string;
  type: 'pickup' | 'delivery' | string;
  region: string;
  weight_kg: number;
  courier_id?: string;
  /** When the courier marked the stop done; absent while it is not. */
  done_at?: string;
}

export interface DispatchState {
  couriers: Courier[];
  orders: Order[];
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

interface StateResponse {
  couriers: { id: string; name: string; route: { stops: { kind: string; order_id?: string }[] } }[];
  orders: Order[];
}

/** Couriers and orders, taken from the dispatch state in one request. */
export async function fetchState(signal?: AbortSignal): Promise<DispatchState> {
  const res = await fetch(`${API_URL}/api/state`, { signal });
  if (!res.ok) throw new Error(`Server answered ${res.status}`);
  const state: StateResponse = await res.json();
  return {
    couriers: state.couriers.map((c) => ({
      id: c.id,
      name: c.name,
      stops: c.route.stops.flatMap((s): RouteStop[] =>
        s.kind === 'hub' ? [{ kind: 'hub' }] : s.order_id ? [{ kind: s.kind === 'pickup' ? 'pickup' : 'delivery', orderId: s.order_id }] : [],
      ),
    })),
    orders: state.orders,
  };
}

/**
 * Marks the stop of one of the courier's orders done. The server checks the
 * rules (the order is theirs, not done yet, every earlier stop is done) and
 * answers with a plain sentence when it refuses; that sentence is thrown.
 */
export async function markStopDone(courierId: string, orderId: string): Promise<Order> {
  const path = `/api/couriers/${encodeURIComponent(courierId)}/stops/${encodeURIComponent(orderId)}/done`;
  const res = await fetch(`${API_URL}${path}`, { method: 'POST' });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? `Server answered ${res.status}`);
  return body as Order;
}
