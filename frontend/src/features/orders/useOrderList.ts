import type { DispatchState } from "@/api/types";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useStoredFlag } from "@/hooks/useStoredFlag";
import { SEARCH_ID } from "./OrderFilters";
import { countByFilter, filterOrders, nextInQueue } from "./orderFilter";
import { useOrderQuery } from "./useOrderQuery";

/**
 * The order list under the map and what the order panel needs from it:
 * the visible orders (filter in the address), counts per filter, the
 * "open the next order" switch, and the arrow keys that move through it.
 */
export function useOrderList(state: DispatchState, selectedId: string | null, onSelect: (id: string | null) => void) {
  const { query, set } = useOrderQuery();
  const [queue, setQueue] = useStoredFlag("dispatch.openNextOrder", true);
  const visible = filterOrders(state, query);

  const step = (by: number) => {
    if (visible.length === 0) return;
    const i = visible.findIndex((o) => o.id === selectedId);
    const next = i < 0 ? (by > 0 ? 0 : visible.length - 1) : Math.min(visible.length - 1, Math.max(0, i + by));
    onSelect(visible[next].id);
  };

  useHotkeys({
    ArrowDown: () => step(1),
    j: () => step(1),
    ArrowUp: () => step(-1),
    k: () => step(-1),
    "/": () => document.getElementById(SEARCH_ID)?.focus(),
  });

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
