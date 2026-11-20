import type { DispatchState, Order } from "@/api/types";

export type OrderFilter = "all" | "free" | "taken" | "problem";

export const orderFilterLabels: Record<OrderFilter, string> = {
  all: "All",
  free: "Free",
  taken: "Assigned",
  problem: "Problems",
};

/** The orders shown in the list for the chosen filter. */
export function filterOrders(state: DispatchState, filter: OrderFilter): Order[] {
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));
  return state.orders.filter((o) => {
    switch (filter) {
      case "free":
        return !o.courier_id && !unassignable.has(o.id);
      case "taken":
        return !!o.courier_id;
      case "problem":
        return unassignable.has(o.id) || o.outside_regions;
      default:
        return true;
    }
  });
}
