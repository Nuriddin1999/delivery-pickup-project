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
  /** When the courier marked the stop done (from the courier app); absent while not done. */
  done_at?: string;
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

/** One courier in an order's "give to" list, checked by the server. */
export interface Candidate {
  courier_id: string;
  allowed: boolean;
  /** refusal code and sentence, when not allowed */
  code?: string;
  reason?: string;
  /** km added to the courier's route, when allowed */
  added_km: number;
  /** the allowed courier whose route grows the least (same rule as auto-assign) */
  nearest: boolean;
  load: { parcels: number; kg: number };
}

export interface CandidateList {
  order_id: string;
  candidates: Candidate[];
}

/** One order of an auto-assign plan, as confirmed by the dispatcher. */
export interface PlanItem {
  order_id: string;
  courier_id: string;
}

/** An auto-assign plan (GET) or what was given out (POST). Assigned comes grouped by courier, in route order. */
export interface AutoAssignResult {
  assigned: (PlanItem & { added_km: number })[];
  unplaced: { order_id: string; reason: string }[];
}
