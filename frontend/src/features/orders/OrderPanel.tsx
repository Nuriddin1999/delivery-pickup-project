import type { DispatchState } from "@/api/types";
import type { Undo } from "@/hooks/useToast";
import { AssignBox, type OrderChange } from "./AssignBox";
import type { OrderList } from "./useOrderList";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  list: OrderList;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChanged: (message: string, undo?: Undo) => void;
}

/**
 * The "Order" tab: the open order with its couriers. With "open the next
 * order" on, giving out an order opens the next free one in the list, so
 * working through the list is one click (or key) per order.
 */
export function OrderPanel({ state, colors, list, selectedId, onSelect, onChanged }: Props) {
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const selected = state.orders.find((o) => o.id === selectedId);

  const changed = (orderId: string, change: OrderChange) => {
    if (list.queue && change.newlyAssigned) {
      // `list` is the list as it was when the courier was picked, so the order is still in it.
      const next = list.nextAfter(orderId);
      onSelect(next);
      onChanged(next ? change.message : `${change.message}. No more free orders in this list.`, change.undo);
      return;
    }
    onChanged(change.message, change.undo);
  };

  if (!selected) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-500">
        <p className="text-[16px] font-medium text-slate-700">No order open</p>
        <p className="text-[13px]">
          Pick an order on the map or in the table, or press <kbd className="rounded border border-slate-300 px-1">↓</kbd> to start with the oldest.
        </p>
      </div>
    );
  }

  return (
    <AssignBox
      key={selected.id}
      order={selected}
      state={state}
      couriersById={couriersById}
      colors={colors}
      onClose={() => onSelect(null)}
      onChanged={(c) => changed(selected.id, c)}
    />
  );
}
