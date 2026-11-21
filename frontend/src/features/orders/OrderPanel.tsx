import type { DispatchState } from "@/api/types";
import type { Undo } from "@/hooks/useToast";
import { AssignBox, type OrderChange } from "./AssignBox";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** opens the order in the Assigned list, after it got its first courier */
  onAssigned: (id: string) => void;
  onChanged: (message: string, undo?: Undo) => void;
}

/**
 * The "Order" tab: the open order with its couriers. When an order gets its
 * first courier, the table switches to Assigned with that order still open,
 * so the dispatcher sees where it went.
 */
export function OrderPanel({ state, colors, selectedId, onSelect, onAssigned, onChanged }: Props) {
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const selected = state.orders.find((o) => o.id === selectedId);

  const changed = (orderId: string, change: OrderChange) => {
    if (change.newlyAssigned) onAssigned(orderId);
    onChanged(change.message, change.undo);
  };

  if (!selected) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-slate-500">
        <p className="text-[16px] font-medium text-slate-700">No order open</p>
        <p className="text-[13px]">
          Pick an order on the map or in the table.
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
