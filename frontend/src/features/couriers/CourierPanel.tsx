import type { DispatchState } from "@/api/types";
import { Checkbox } from "@/shared/ui/Checkbox";
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
}

/** Every courier with load, stops and km, then the orders nobody can take. */
export function CourierPanel({ state, colors, focusedId, showShorter, onFocus, onShowShorter, onSelectOrder }: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <Checkbox checked={showShorter} onChange={onShowShorter}>
        Show stops in the shorter order (bonus: better routes)
      </Checkbox>

      {state.couriers.map((c) => (
        <CourierCard
          key={c.id}
          courier={c}
          color={colors[c.id]}
          focused={focusedId === c.id}
          showShorter={showShorter}
          onToggleFocus={() => onFocus(focusedId === c.id ? null : c.id)}
          onSelectOrder={onSelectOrder}
        />
      ))}

      <UnassignableList items={state.unassignable} onSelectOrder={onSelectOrder} />
    </div>
  );
}
