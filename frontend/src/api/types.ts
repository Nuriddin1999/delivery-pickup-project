// JSON shapes the Go server sends and accepts.
// Keep in sync with backend/internal/transport/httpapi/responses.go.

export type Kind = "pickup" | "delivery";

export interface Point {
  lat: number;
  lng: number;
}

export interface Courier {
  id: string;
  name: string;
  active: boolean;
  kinds: Kind[];
  regions: string[];
  max_parcels: number;
  max_kg: number;
  start: Point;
}

export interface Stop {
  kind: "start" | "pickup" | "hub" | "delivery";
  order_id?: string;
  point: Point;
  leg_km: number;
}

export interface Route {
  stops: Stop[];
  total_km: number;
}

export interface CourierView extends Courier {
  load: { parcels: number; kg: number };
  route: Route;
  better_route: Route;
  outside_regions: string[];
}

export interface Order {
  id: string;
  seed_id: string;
  type: string; // may be something other than a Kind when the order is broken
  region: string;
  location: Point | null;
  weight_kg: number;
  created_at: string;
  courier_id?: string;
  problems?: string[];
  notes?: string[];
  outside_regions: boolean;
}

export interface Unassignable {
  order_id: string;
  broken: boolean;
  reason: string;
}

export interface DispatchState {
  hub: Point & { name: string };
  regions: string[];
  couriers: CourierView[];
  orders: Order[];
  unassignable: Unassignable[];
}

export interface NewCourierInput {
  name: string;
  active: boolean;
  kinds: Kind[];
  regions: string[];
  max_parcels: number;
  max_kg: number;
  start: Point;
}

export interface AutoAssignResult {
  assigned: { order_id: string; courier_id: string; added_km: number }[];
  unplaced: { order_id: string; reason: string }[];
}
