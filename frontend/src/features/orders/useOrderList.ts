import type { DispatchState } from "@/api/types";
import { countByFilter, filterOrders } from "./orderFilter";
import { useOrderQuery } from "./useOrderQuery";

/**
 * The order list under the map and what the order panel needs from it:
 * the visible orders (filter in the address) and the counts per filter.
 */
export function useOrderList(state: DispatchState) {
  const { query, set, searchWith } = useOrderQuery();
  const visible = filterOrders(state, query);

  return {
    query,
    setQuery: set,
    visible,
    counts: countByFilter(state, query),
    /** the query string for the list with some parts changed (region and search kept) */
    searchWith,
  };
}

export type OrderList = ReturnType<typeof useOrderList>;
