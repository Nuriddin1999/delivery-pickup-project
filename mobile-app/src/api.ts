import Constants from 'expo-constants';
import { Platform } from 'react-native';

export interface Courier {
  id: string;
  name: string;
  /** The courier's order ids in the order of their route. */
  routeOrderIds: string[];
}

export interface Order {
  id: string;
  type: 'pickup' | 'delivery' | string;
  region: string;
  weight_kg: number;
  courier_id?: string;
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
  couriers: { id: string; name: string; route: { stops: { order_id?: string }[] } }[];
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
      routeOrderIds: c.route.stops.flatMap((s) => (s.order_id ? [s.order_id] : [])),
    })),
    orders: state.orders,
  };
}

/** The courier's orders, in the order of their route. */
export function ordersOf(courier: Courier, orders: Order[]): Order[] {
  const byId = new Map(orders.map((o) => [o.id, o]));
  const inRoute = courier.routeOrderIds.flatMap((id) => byId.get(id) ?? []);
  // Anything held but missing from the route (should not happen) goes last.
  const rest = orders.filter((o) => o.courier_id === courier.id && !courier.routeOrderIds.includes(o.id));
  return [...inRoute, ...rest];
}
