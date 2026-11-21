import type { DispatchState } from "@/api/types";
import { Button } from "@/shared/ui/Button";
import { Checkbox } from "@/shared/ui/Checkbox";
import { cn, hintText } from "@/shared/ui/styles";
import { OrderFilters } from "./OrderFilters";
import { OrderRow } from "./OrderRow";
import type { OrderList } from "./useOrderList";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  list: OrderList;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** the table fills the column and the map is hidden */
  expanded: boolean;
  onExpand: () => void;
  onShowMap: () => void;
}

const head = "sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[13px] font-medium text-slate-600";

/** The order table under the map: filters, then one row per order, oldest first. */
export function OrdersTable({ state, colors, list, selectedId, onSelect, expanded, onExpand, onShowMap }: Props) {
  const couriersById = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 pt-3 pb-2">
        <OrderFilters query={list.query} counts={list.counts} regions={state.regions} onChange={list.setQuery} />
        <div className="flex items-center justify-between gap-2">
          <Checkbox checked={list.queue} onChange={list.setQueue}>
            <span className="text-[13px] text-slate-600">Open the next free order after giving one out</span>
          </Checkbox>
          <Button
            className="flex items-center gap-1.5 py-1 text-[13px]"
            onClick={expanded ? onShowMap : onExpand}
            title={expanded ? "Bring the map back" : "Give the table the whole height; the map hides"}
          >
            <span aria-hidden className={cn("inline-block transition-transform duration-300", expanded && "rotate-180")}>
              ⇡
            </span>
            {expanded ? "Show map" : "Expand table"}
          </Button>
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        {list.visible.length === 0 ? (
          <p className={`${hintText} p-4`}>No orders match. {list.query.show === "free" && "Every order a courier can take has one."}</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={head} />
                <th className={head}>Order</th>
                <th className={head}>Type</th>
                <th className={head}>Region</th>
                <th className={`${head} text-right`}>Weight</th>
                <th className={head}>Created</th>
                <th className={head}>Courier</th>
                <th className={head} />
              </tr>
            </thead>
            <tbody>
              {list.visible.map((o) => {
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
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
