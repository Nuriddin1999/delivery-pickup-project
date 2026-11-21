import type { DispatchState, Order } from "@/api/types";

export type OrderFilter = "free" | "taken" | "problem" | "all";

export const orderFilterLabels: Record<OrderFilter, string> = {
  free: "Free",
  taken: "Assigned",
  problem: "Problems",
  all: "All",
};

/** What the order list shows; kept in the page address. */
export interface OrderQuery {
  show: OrderFilter;
  /** "" for every region */
  region: string;
  /** part of an order id, "" for any */
  q: string;
}

export const defaultShow: OrderFilter = "free";

export function isOrderFilter(v: string | null): v is OrderFilter {
  return v !== null && v in orderFilterLabels;
}

function matchesFilter(o: Order, f: OrderFilter, unassignable: Set<string>) {
  switch (f) {
    case "free":
      return !o.courier_id && !unassignable.has(o.id);
    case "taken":
      return !!o.courier_id;
    case "problem":
      return unassignable.has(o.id) || o.outside_regions;
    default:
      return true;
  }
}

function matchesSearch(o: Order, region: string, q: string) {
  return (!region || o.region === region) && (!q || o.id.toLowerCase().includes(q.trim().toLowerCase()));
}

const createdMs = (o: Order) => Date.parse(o.created_at) || 0;

/** The orders shown in the list, oldest first (the order auto-assign uses too). */
export function filterOrders(state: DispatchState, query: OrderQuery): Order[] {
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));
  return state.orders
    .filter((o) => matchesFilter(o, query.show, unassignable) && matchesSearch(o, query.region, query.q))
    .sort((a, b) => createdMs(a) - createdMs(b));
}

/** How many orders each filter would show with the current region and search. */
export function countByFilter(state: DispatchState, query: OrderQuery): Record<OrderFilter, number> {
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));
  const found = state.orders.filter((o) => matchesSearch(o, query.region, query.q));
  const count = (f: OrderFilter) => found.filter((o) => matchesFilter(o, f, unassignable)).length;
  return { free: count("free"), taken: count("taken"), problem: count("problem"), all: found.length };
}
