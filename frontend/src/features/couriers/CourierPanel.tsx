import type { DispatchState } from "@/api/types";
import type { ShowPoint } from "@/features/map/usePointHighlight";
import { CourierCard } from "./CourierCard";
import { UnassignableList } from "./UnassignableList";

interface Props {
  state: DispatchState;
  colors: Record<string, string>;
  focusedId: string | null;
  showShorter: boolean;
  onFocus: (id: string | null) => void;
  onShowShorter: (v: boolean) => void;
  onSelectOrder: (id: string) => void;
  onShowPoint?: ShowPoint;
}

/** Every courier as one line (active first), then the orders nobody can take. */
export function CourierPanel({ state, colors, focusedId, showShorter, onFocus, onShowShorter, onSelectOrder, onShowPoint }: Props) {
  // Inactive couriers cannot take anything today, so they go to the bottom.
  const couriers = [...state.couriers].sort((a, b) => Number(b.active) - Number(a.active));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-[1fr_60px_88px_64px] gap-2.5 px-4 text-xs text-slate-500">
        <span>Courier</span>
        <span>Parcels</span>
        <span>Weight, kg</span>
        <span className="text-right">Route</span>
      </div>

      {couriers.map((c) => (
        <CourierCard
          key={c.id}
          courier={c}
          color={colors[c.id]}
          open={focusedId === c.id}
          showShorter={showShorter}
          onToggle={() => onFocus(focusedId === c.id ? null : c.id)}
          onShowShorter={onShowShorter}
          onSelectOrder={onSelectOrder}
          onShowPoint={onShowPoint}
        />
      ))}

      <UnassignableList items={state.unassignable} onSelectOrder={onSelectOrder} />
    </div>
  );
}
