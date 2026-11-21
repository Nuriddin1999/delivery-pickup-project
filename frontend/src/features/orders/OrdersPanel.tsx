import { useState } from "react";
import type { DispatchState } from "@/api/types";
import type { Undo } from "@/hooks/useToast";
import { Card } from "@/shared/ui/Card";
import { hintText } from "@/shared/ui/styles";
import { AssignBox } from "./AssignBox";
import { OrderFilters } from "./OrderFilters";
import { OrderRow } from "./OrderRow";
import { filterOrders, type OrderFilter } from "./orderFilter";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChanged: (message: string, undo?: Undo) => void;
}

/** The selected order's assign box, then every order in a filterable list. */
export function OrdersPanel({ state, colors, selectedId, onSelect, onChanged }: Props) {
  const [filter, setFilter] = useState<OrderFilter>("all");
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));
  const selected = state.orders.find((o) => o.id === selectedId);

  return (
    <div className="flex flex-col gap-2.5">
      {selected ? (
        <AssignBox key={selected.id} order={selected} state={state} couriersById={couriersById} colors={colors} onClose={() => onSelect(null)} onChanged={(c) => onChanged(c.message, c.undo)} />
      ) : (
        <Card>
          <p className={hintText}>Pick an order on the map or in the list below to give it to a courier.</p>
        </Card>
      )}

      <OrderFilters value={filter} onChange={setFilter} />

      <ul className="m-0 list-none p-0">
        {filterOrders(state, filter).map((o) => {
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
    </div>
  );
}
