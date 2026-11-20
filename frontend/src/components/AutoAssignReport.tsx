import type { AutoResult, State } from "../types";
import { btnLink, card, cardTitle, cn, muted } from "../ui";

interface Props {
  result: AutoResult;
  state: State;
  onClose: () => void;
  onSelectOrder: (id: string) => void;
}

/** What the last auto-assign did, and why some orders were not placed. */
export function AutoAssignReport({ result, state, onClose, onSelectOrder }: Props) {
  const names = Object.fromEntries(state.couriers.map((c) => [c.id, c.name]));
  const { assigned, unplaced } = result;
  return (
    <div className={cn(card, "flex flex-col gap-1.5")}>
      <div className="flex items-center justify-between">
        <h3 className={cardTitle}>
          Auto-assign: {assigned.length} placed, {unplaced.length} not placed
        </h3>
        <button className={btnLink} onClick={onClose}>
          close
        </button>
      </div>
      {assigned.length > 0 && <p className={muted}>{assigned.map((a) => `${a.order_id} → ${names[a.courier_id]} (+${a.added_km.toFixed(2)} km)`).join(", ")}</p>}
      <ul className="m-0 list-none p-0">
        {unplaced.map((u) => (
          <li key={u.order_id} className="cursor-pointer border-b border-slate-200 py-1.5 text-[13px] hover:bg-slate-50" onClick={() => onSelectOrder(u.order_id)}>
            <b>{u.order_id}</b>: {u.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
