import type { State } from "../types";
import { checkLabel, muted, tagBad, tagWarn } from "../ui";
import { CourierCard } from "./CourierCard";

interface Props {
  state: State;
  colors: Record<string, string>;
  focusId: string | null;
  showBetter: boolean;
  onFocus: (id: string | null) => void;
  onShowBetter: (v: boolean) => void;
  onSelectOrder: (id: string) => void;
}

export function CourierPanel(p: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <label className={checkLabel}>
        <input type="checkbox" checked={p.showBetter} onChange={(e) => p.onShowBetter(e.target.checked)} />
        Show stops in the shorter order (bonus: better routes)
      </label>
      {p.state.couriers.map((c) => (
        <CourierCard
          key={c.id}
          courier={c}
          color={p.colors[c.id]}
          focused={p.focusId === c.id}
          showBetter={p.showBetter}
          onFocus={() => p.onFocus(p.focusId === c.id ? null : c.id)}
          onSelectOrder={p.onSelectOrder}
        />
      ))}

      <h3 className="mt-2.5 text-[15px] font-semibold">Orders that cannot be assigned</h3>
      {p.state.unassignable.length === 0 && <p className={muted}>None.</p>}
      <ul className="m-0 list-none p-0">
        {p.state.unassignable.map((u) => (
          <li key={u.order_id} className="cursor-pointer border-b border-slate-200 py-1.5 text-[13px] hover:bg-slate-50" onClick={() => p.onSelectOrder(u.order_id)}>
            <b>{u.order_id}</b> <span className={u.broken ? tagBad : tagWarn}>{u.broken ? "broken data" : "no courier fits"}</span>
            <div>{u.reason}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
