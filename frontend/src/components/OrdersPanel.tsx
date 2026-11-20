import { useState } from "react";
import { isBroken, kg, kindLabel } from "../logic";
import type { State } from "../types";
import { card, cn, hint, muted, tagBad, tagWarn } from "../ui";
import { AssignBox } from "./AssignBox";

type Filter = "all" | "free" | "taken" | "problem";

const filterLabels: Record<Filter, string> = { all: "All", free: "Free", taken: "Assigned", problem: "Problems" };

interface Props {
  state: State;
  colors: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChanged: (message: string) => void;
}

export function OrdersPanel({ state, colors, selectedId, onSelect, onChanged }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const byId = Object.fromEntries(state.couriers.map((c) => [c.id, c]));
  const unassignable = new Set(state.unassignable.map((u) => u.order_id));
  const selected = state.orders.find((o) => o.id === selectedId) ?? null;

  const shown = state.orders.filter((o) => {
    if (filter === "free") return !o.courier_id && !unassignable.has(o.id);
    if (filter === "taken") return !!o.courier_id;
    if (filter === "problem") return unassignable.has(o.id) || o.outside_regions;
    return true;
  });

  return (
    <div className="flex flex-col gap-2.5">
      {selected ? (
        <AssignBox key={selected.id} order={selected} state={state} byId={byId} onClose={() => onSelect(null)} onChanged={onChanged} />
      ) : (
        <p className={cn(hint, card)}>Pick an order on the map or in the list below to give it to a courier.</p>
      )}

      <div className="flex gap-1">
        {(Object.keys(filterLabels) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            className={cn("cursor-pointer rounded-md border px-2.5 py-0.5 text-[13px]", filter === f ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white hover:bg-slate-50")}
            onClick={() => setFilter(f)}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      <ul className="m-0 list-none p-0">
        {shown.map((o) => {
          const c = o.courier_id ? byId[o.courier_id] : undefined;
          return (
            <li key={o.id} className={cn("flex cursor-pointer items-center gap-2 border-b border-slate-200 px-2 py-1.5 hover:bg-slate-50", o.id === selectedId && "bg-blue-50")} onClick={() => onSelect(o.id)}>
              <span
                className={cn("size-3 flex-none border-2 border-slate-700 bg-white", o.type === "pickup" ? "rounded-[2px]" : "rounded-full")}
                style={c ? { background: colors[c.id], borderColor: colors[c.id] } : undefined}
              />
              <b>{o.id}</b>
              <span>{kindLabel(o.type)}</span>
              <span className={muted}>{o.region || "—"}</span>
              <span className={muted}>{kg(o.weight_kg)}</span>
              <span className="ml-auto flex items-center gap-1">
                {isBroken(o) ? (
                  <span className={tagBad}>broken</span>
                ) : c ? (
                  <>
                    {c.name}
                    {o.outside_regions && (
                      <span className={tagWarn} title="Outside the courier's regions">
                        outside
                      </span>
                    )}
                  </>
                ) : unassignable.has(o.id) ? (
                  <span className={tagBad}>no courier fits</span>
                ) : (
                  <span className={muted}>free</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
