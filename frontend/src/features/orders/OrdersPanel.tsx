import type { DispatchState } from "@/api/types";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useStoredFlag } from "@/hooks/useStoredFlag";
import type { Undo } from "@/hooks/useToast";
import { Card } from "@/shared/ui/Card";
import { Checkbox } from "@/shared/ui/Checkbox";
import { hintText } from "@/shared/ui/styles";
import { AssignBox, type OrderChange } from "./AssignBox";
import { OrderFilters, SEARCH_ID } from "./OrderFilters";
import { OrderRow } from "./OrderRow";
import { countByFilter, filterOrders, nextInQueue } from "./orderFilter";
import { useOrderQuery } from "./useOrderQuery";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChanged: (message: string, undo?: Undo) => void;
}

/**
 * The selected order's courier list, then the filterable order list.
 * With "open the next order" on, giving out an order opens the next free
 * one, so working through the list is one click (or key) per order.
 */
export function OrdersPanel({ state, colors, selectedId, onSelect, onChanged }: Props) {
  const { query, set } = useOrderQuery();
  const [queue, setQueue] = useStoredFlag("dispatch.openNextOrder", true);
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));
  const selected = state.orders.find((o) => o.id === selectedId);
  const visible = filterOrders(state, query);

  const changed = (orderId: string, change: OrderChange) => {
    if (queue && change.newlyAssigned) {
      // `visible` is the list as it was when the courier was picked, so the order is still in it.
      const next = nextInQueue(visible, orderId, state);
      onSelect(next);
      onChanged(next ? change.message : `${change.message}. No more free orders in this list.`, change.undo);
      return;
    }
    onChanged(change.message, change.undo);
  };

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

  return (
    <div className="flex flex-col gap-2.5">
      {selected ? (
        <AssignBox
          key={selected.id}
          order={selected}
          state={state}
          couriersById={couriersById}
          colors={colors}
          onClose={() => onSelect(null)}
          onChanged={(c) => changed(selected.id, c)}
        />
      ) : (
        <Card>
          <p className={hintText}>
            Pick an order on the map or in the list, or press <kbd>↓</kbd> to start with the oldest. Then click a courier or press their number.
          </p>
        </Card>
      )}

      <OrderFilters query={query} counts={countByFilter(state, query)} regions={state.regions} onChange={set} />
      <Checkbox checked={queue} onChange={setQueue}>
        <span className="text-[13px]">Open the next free order after giving one out</span>
      </Checkbox>

      {visible.length === 0 ? (
        <p className={hintText}>No orders match. {query.show === "free" && "Every order a courier can take has one."}</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {visible.map((o) => {
            const courier = o.courier_id ? couriersById[o.courier_id] : undefined;
            return (
              <OrderRow
                key={o.id}
                order={o}
                courier={courier}
                color={courier ? colors[courier.id] : null}
                unassignable={unassignable.has(o.id)}
                selected={o.id === selectedId}
                onSelect={() => onSelect(o.id)}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
