import type { DispatchState } from "@/api/types";
import { useStoredFlag } from "@/hooks/useStoredFlag";
import { countByFilter, filterOrders, nextInQueue } from "./orderFilter";
import { useOrderQuery } from "./useOrderQuery";

/**
 * The order list under the map and what the order panel needs from it:
 * the visible orders (filter in the address), counts per filter, the
 * "open the next order" switch.
 */
export function useOrderList(state: DispatchState) {
  const { query, set } = useOrderQuery();
  const [queue, setQueue] = useStoredFlag("dispatch.openNextOrder", true);
  const visible = filterOrders(state, query);

  return {
    query,
    setQuery: set,
    visible,
    counts: countByFilter(state, query),
    queue,
    setQueue,
    /** the free order to open after `id` was given out, in this list */
    nextAfter: (id: string) => nextInQueue(visible, id, state),
  };
}

export type OrderList = ReturnType<typeof useOrderList>;
